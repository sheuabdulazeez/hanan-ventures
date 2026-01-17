import { type NextRequest, NextResponse } from "next/server"
import { updateProductUnit, deleteProductUnit } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const productUnit = await updateProductUnit(params.id, body)
    return NextResponse.json(productUnit)
  } catch (error) {
    console.error("Error updating product unit:", error)
    return NextResponse.json({ error: "Failed to update product unit" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteProductUnit(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting product unit:", error)
    return NextResponse.json({ error: "Failed to delete product unit" }, { status: 500 })
  }
}
