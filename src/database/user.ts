import { TUser } from "@/types/database";
import { initDatabase } from ".";
import bcrypt from "bcryptjs"


export async function getUsers() {
    const db = await initDatabase();
    const result = await db.select<TUser[]>('SELECT * FROM users');
    return result;
  }


export async function create(user: Omit<TUser, "id" | "created_at">){
    const db = await initDatabase();
    const password = await bcrypt.hash(user.password, 10);
    const {lastInsertId: id} = await db.execute('INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4)', [user.name, user.username, password, "user"]);
    return id;
}
  export async function initializeSuperUser(){
    const db = await initDatabase();

    // Check if the super user already exists
    const [superUser] = await db.select<TUser[]>('SELECT * FROM users WHERE username = $1', ["admin"]);
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
    const [user] = await db.select<TUser[]>('SELECT * FROM users WHERE username = $1', [username]);
    if(!user) return {error: "User not found"};
    const isValid = await bcrypt.compare(password, user.password);
    if(!isValid) return {error: "Invalid password"};
    return user;
}