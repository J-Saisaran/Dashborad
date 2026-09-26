import { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/environment.js';
import { comparePassword, hashPassword, generateRandomToken, hashToken } from '../utils/crypto.js';
import { signAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { LoginInput, RegisterInput } from '../validators/auth.validator.js';

export class AuthService {
  /**
   * Register a new user and immediately issue tokens.
   */
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new UnauthorizedError('A user with this email address already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role || Role.DEVELOPER,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRandomToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      rawRefreshToken,
    };
  }
  /**
   * Authenticate a user with email and password.
   * Issues a short-lived access token and a long-lived refresh token.
   */
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRandomToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // Save refresh token record
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      rawRefreshToken,
    };
  }

  /**
   * Rotate refresh token and issue a new access token.
   * Defense-in-depth: if token is reused or revoked, invalidates session.
   */
  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (tokenRecord.isRevoked) {
      // Possible token theft / replay attack: revoke all tokens for this user for security
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError('Revoked refresh token reused. Session invalidated.', 'TOKEN_REVOKED');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Rotate: Revoke the used refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Issue new tokens
    const user = tokenRecord.user;
    const newAccessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRawRefreshToken = generateRandomToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: user.id,
        expiresAt: newExpiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: newAccessToken,
      newRawRefreshToken,
    };
  }

  /**
   * Log out user by revoking the refresh token.
   */
  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }
  }

  /**
   * Get user profile details by id.
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    return user;
  }
}

export const authService = new AuthService();
