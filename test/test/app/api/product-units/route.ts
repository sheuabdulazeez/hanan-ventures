import { type NextRequest, NextResponse } from "next/server"
import { getProductUnits, createProductUnit } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const productUnits = await getProductUnits(productId)
    return NextResponse.json(productUnits)
  } catch (error) {
    console.error("Error fetching product units:", error)
    return NextResponse.json({ error: "Failed to fetch product units" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const productUnit = await createProductUnit(body)
    return NextResponse.json(productUnit)
  } catch (error) {
    console.error("Error creating product unit:", error)
    return NextResponse.json({ error: "Failed to create product unit" }, { status: 500 })
  }
}
