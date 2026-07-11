import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { jwt } from "@elysiajs/jwt";

const prisma = new PrismaClient();

// Setup JWT Plugin
export const authPlugin = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "SUPER_SECRET_KOPDES_KEY",
    })
  );

export const authRoute = new Elysia({ prefix: "/api/auth" })
  .use(authPlugin)
  
  // ==========================================
  // AGENT 2: REGISTER API
  // ==========================================
  .post(
    "/register",
    async ({ body, set }) => {
      try {
        const { nama, email, password, role, idKoperasi, idSppg } = body;

        // Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          set.status = 400;
          return { code: 400, status: false, message: "Email sudah terdaftar" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat user baru
        const newUser = await prisma.user.create({
          data: {
            nama,
            email,
            password: hashedPassword,
            role,
            idKoperasi: idKoperasi || null,
            idSppg: idSppg || null,
          },
        });

        set.status = 201;
        return {
          code: 201,
          status: true,
          message: "Registrasi berhasil",
          data: {
            id: newUser.id,
            nama: newUser.nama,
            email: newUser.email,
            role: newUser.role,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { code: 500, status: false, message: error.message || "Terjadi kesalahan server" };
      }
    },
    {
      body: t.Object({
        nama: t.String({ minLength: 3 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        role: t.Union([t.Literal("pengurus"), t.Literal("sppg"), t.Literal("admin")]),
        idKoperasi: t.Optional(t.Number()),
        idSppg: t.Optional(t.Number()),
      }),
    }
  )

  // ==========================================
  // AGENT 3: LOGIN API
  // ==========================================
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      try {
        const { email, password } = body;

        // Cari user
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          set.status = 401;
          return { code: 401, status: false, message: "Email atau password salah" };
        }

        // Cek password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          set.status = 401;
          return { code: 401, status: false, message: "Email atau password salah" };
        }

        // Generate JWT token
        const token = await jwt.sign({
          id: user.id,
          email: user.email,
          role: user.role,
          idKoperasi: user.idKoperasi,
          idSppg: user.idSppg
        });

        return {
          code: 200,
          status: true,
          message: "Login berhasil",
          data: {
            token,
            user: {
              id: user.id,
              nama: user.nama,
              email: user.email,
              role: user.role,
              idKoperasi: user.idKoperasi,
              idSppg: user.idSppg
            }
          }
        };
      } catch (error: any) {
        set.status = 500;
        return { code: 500, status: false, message: error.message || "Terjadi kesalahan server" };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )

  // ==========================================
  // AGENT 4: PROFILE (ME) API
  // ==========================================
  .get(
    "/me",
    async ({ headers, jwt, set }) => {
      try {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          set.status = 401;
          return { code: 401, status: false, message: "Token tidak ditemukan" };
        }

        const token = authHeader.split(" ")[1];
        const payload = await jwt.verify(token);

        if (!payload || !payload.id) {
          set.status = 401;
          return { code: 401, status: false, message: "Token tidak valid" };
        }

        const user = await prisma.user.findUnique({
          where: { id: payload.id as number },
          select: {
            id: true,
            nama: true,
            email: true,
            role: true,
            koperasi: true,
            sppg: true,
          },
        });

        if (!user) {
          set.status = 404;
          return { code: 404, status: false, message: "User tidak ditemukan" };
        }

        return {
          code: 200,
          status: true,
          message: "Berhasil mengambil data profil",
          data: user,
        };
      } catch (error: any) {
        set.status = 500;
        return { code: 500, status: false, message: error.message || "Terjadi kesalahan server" };
      }
    }
  );
