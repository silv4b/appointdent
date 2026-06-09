import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      if (
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/auth")
      ) {
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single()

    const role = profile?.role ?? "receptionist"
    const path = request.nextUrl.pathname
    const mustChangePassword = profile?.must_change_password ?? false

    if (mustChangePassword && path !== "/perfil") {
      return NextResponse.redirect(new URL("/perfil", request.url))
    }

    const adminRoutes = ["/admin"]
    const dentistRoutes = ["/minha-agenda", "/minhas-anamneses", "/meus-procedimentos"]
    const adminOnlyRoutes = ["/procedimentos"]

    if (adminOnlyRoutes.some((r) => path === r || path.startsWith(r)) && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    if (adminRoutes.some((r) => path === r || path.startsWith(r + "/")) && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    if (dentistRoutes.some((r) => path.startsWith(r)) && role !== "dentist") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    return supabaseResponse
  } catch {
    // Em caso de erro (ex: token inválido após db reset),
    // permite acesso a /login e /auth; redireciona o resto
    if (
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }
}
