import type { Request, Response, NextFunction } from "express";
import {
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  RegisterSchema,
} from "@audithub/types";
import * as service from "./service.js";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await service.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body ?? {};
    const result = await service.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function forgot(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ForgotPasswordSchema.parse(req.body);
    await service.forgotPassword(input.email);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function reset(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    await service.resetPassword(input);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ChangePasswordSchema.parse(req.body);
    await service.changePassword(req.auth!.userId, input);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await service.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.me(req.auth!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
