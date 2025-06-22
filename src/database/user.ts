import { TUser } from "@/types/database";
import { initDatabase } from ".";
import bcrypt from "bcryptjs"


export async function getUsers() {
    const db = await initDatabase();
    const result = await db.select<TUser[]>('SELECT * FROM users');
    return result;
}


export async function create(user: Omit<TUser, "id" | "created_at" | "updated_at">){
    const db = await initDatabase();
    const password = await bcrypt.hash(user.password, 10);
    const {lastInsertId: id} = await db.execute('INSERT INTO users (name, username, phone, password, role) VALUES ($1, $2, $3, $4, $5)', [user.name, user.username, user.phone, password, user.role]);
    return id;
}

export async function update(id: string, user: Omit<TUser, "id" | "created_at" | "updated_at">){
    const db = await initDatabase();
    // If the password is provided, we have to update the password
    if(!user.password) return db.execute('UPDATE users SET name = $1, username = $2, role = $3, phone = $4 WHERE id = $5', [user.name, user.username, user.role, user.phone, id]);
    const password = await bcrypt.hash(user.password, 10);
    return db.execute('UPDATE users SET name = $1, username = $2, password = $3, role = $4, phone = $5 WHERE id = $6', [user.name, user.username, password, user.role, user.phone, id]);
}

  export async function initializeSuperUser(){
    const db = await initDatabase();

    // Check if the super user already exists
    const superUser = await db.selectOne<TUser>('SELECT * FROM users WHERE username = $1', ["admin"]);
    if(superUser) return;
    try {
        const password = await bcrypt.hash("admin123", 10);
        await db.execute('INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4)', ["Super", "admin", password, "admin"])
    } catch (error) {
        console.error("There was an error trying to create super admin", error.message)
    }
}

export async function login(username: string, password: string): Promise<TUser | {error: string}>{
    const db = await initDatabase();
    const user = await db.selectOne<TUser>('SELECT * FROM users WHERE username = $1', [username]);
    if(!user) return {error: "User not found"};
    const isValid = await bcrypt.compare(password, user.password);
    if(!isValid) return {error: "Invalid password"};
    return user;
}