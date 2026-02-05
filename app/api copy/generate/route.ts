import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ result: "GET FUNKAR ✅" });
}

export async function POST() {
  return NextResponse.json({ result: "POST FUNKAR ✅" });
}
