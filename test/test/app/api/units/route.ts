import { NextResponse } from "next/server"
import { getCommonUnits } from "@/lib/database"

export async function GET() {
  try {
    const units = await getCommonUnits()
    return NextResponse.json(units)
  } catch (error) {
    console.error("Error fetching units:", error)
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
  }
}
