import { prisma } from "../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback_secret";

export const AuthController = {
  // ─── REGISTER ─────────────────────────────────────────
  async register({ body, set }: any) {
    const { nama, email, password, role } = body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      set.status = 409;
      return { success: false, message: "Email sudah terdaftar" };
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { nama, email, password: hashed, role: role ?? "pengurus" },
      select: { id: true, nama: true, email: true, role: true, createdAt: true },
    });

    set.status = 201;
    return { success: true, message: "Registrasi berhasil", data: user };
  },

  // ─── LOGIN ────────────────────────────────────────────
  async login({ body, set }: any) {
    const { email, password } = body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      set.status = 401;
      return { success: false, message: "Email atau password salah" };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      set.status = 401;
      return { success: false, message: "Email atau password salah" };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      success: true,
      message: "Login berhasil",
      data: {
        token,
        user: { id: user.id, nama: user.nama, email: user.email, role: user.role },
      },
    };
  },

  // ─── ME ───────────────────────────────────────────────
  async me({ headers, set }: any) {
    const authHeader = headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401;
      return { success: false, message: "Token tidak ditemukan" };
    }

    try {
      const token = authHeader.split(" ")[1] ?? "";
      const payload = jwt.verify(token, JWT_SECRET) as unknown as {
        id: number;
        email: string;
        role: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, nama: true, email: true, role: true, createdAt: true },
      });

      if (!user) {
        set.status = 404;
        return { success: false, message: "User tidak ditemukan" };
      }

      return { success: true, data: user };
    } catch {
      set.status = 401;
      return { success: false, message: "Token tidak valid atau sudah expired" };
    }
  },
};
