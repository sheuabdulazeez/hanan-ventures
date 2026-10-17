import { TUser } from "@/types/database";
import { invoke } from "@tauri-apps/api/core";
import { initDatabase } from ".";

/*
 * Authentication and user management run in the Rust backend: passwords are
 * hashed and checked there, and the logged-in role used for authorization is held
 * there too, so the webview cannot claim a role or write the users table directly.
 */

// Rows come back with snake_case columns; the UI works with `isActive`.
function toUser(row: any): TUser {
    return {
        ...row,
        isActive: row.is_active === undefined ? true : Boolean(row.is_active),
        must_change_password: Boolean(row.must_change_password),
    } as TUser;
}

function errorMessage(error: unknown): string {
    return typeof error === "string" ? error : (error as Error)?.message || "Something went wrong";
}

export async function getUsers() {
    const db = await initDatabase();
    const result = await db.select<any[]>("SELECT * FROM users WHERE role != 'super_admin' ORDER BY name ASC");
    return result.map(toUser);
}

export async function create(user: Omit<TUser, "id" | "created_at" | "updated_at">) {
    try {
        return await invoke<string>("create_user", {
            user: {
                name: user.name,
                username: user.username,
                phone: user.phone,
                password: user.password,
                role: user.role,
            },
        });
    } catch (error) {
        throw new Error(errorMessage(error));
    }
}

export async function update(id: string, user: Omit<TUser, "id" | "created_at" | "updated_at">) {
    try {
        await invoke("update_user", {
            id,
            user: {
                name: user.name,
                username: user.username,
                phone: user.phone,
                role: user.role,
                password: user.password || null,
            },
        });
    } catch (error) {
        throw new Error(errorMessage(error));
    }
}

export async function toggleActive(id: string, isActive: boolean) {
    try {
        await invoke("set_user_active", { id, isActive });
    } catch (error) {
        throw new Error(errorMessage(error));
    }
}

/** Change the logged-in user's own password. */
export async function changePassword(newPassword: string) {
    try {
        await invoke("change_password", { newPassword });
    } catch (error) {
        throw new Error(errorMessage(error));
    }
}

export async function login(username: string, password: string): Promise<TUser | { error: string }> {
    try {
        const row = await invoke<any>("login", { username, password });
        return toUser(row);
    } catch (error) {
        return { error: errorMessage(error) };
    }
}

export async function logoutSession() {
    try {
        await invoke("logout");
    } catch (error) {
        console.error("Failed to end session", error);
    }
}

/** The user the backend considers logged in, if any (survives a UI reload). */
export async function getActiveSession(): Promise<TUser | null> {
    try {
        const row = await invoke<any | null>("get_session");
        return row ? toUser(row) : null;
    } catch {
        return null;
    }
}
