import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "./prisma";

const rpName = process.env.NEXT_PUBLIC_RP_NAME || "AI Interviewer";
const expectedRPID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const expectedOrigin = process.env.BETTER_AUTH_URL || "http://localhost:3080";

export async function getRegistrationOptions(userId: string, userEmail: string) {
  const userPasskeys = await prisma.passkey.findMany({
    where: { userId },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID: expectedRPID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    attestationType: "none",
    excludeCredentials: userPasskeys.map((p) => ({
      id: p.credentialID,
      transports: p.transports ? (JSON.parse(p.transports) as any) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // 既存の古いチャレンジを削除して新規作成
  await prisma.verification.deleteMany({
    where: { identifier: `passkey_reg_${userId}` },
  });
  await prisma.verification.create({
    data: {
      identifier: `passkey_reg_${userId}`,
      value: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return options;
}

export async function verifyAndSaveRegistration(
  userId: string,
  response: RegistrationResponseJSON
) {
  const storedChallenge = await prisma.verification.findFirst({
    where: { identifier: `passkey_reg_${userId}` },
  });

  if (!storedChallenge || storedChallenge.expiresAt < new Date()) {
    throw new Error("Registration challenge expired or not found");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: storedChallenge.value,
    expectedOrigin: [expectedOrigin, "http://localhost:3080", "https://zyuuuukak1n.dev"],
    expectedRPID: expectedRPID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verification failed");
  }

  const { credential } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId,
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: JSON.stringify(response.response.transports || []),
    },
  });

  await prisma.verification.deleteMany({
    where: { identifier: `passkey_reg_${userId}` },
  });

  return verification;
}

export async function getAuthenticationOptions(userEmail?: string) {
  let allowCredentials = undefined;
  if (userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { passkeys: true },
    });
    if (user && user.passkeys.length > 0) {
      allowCredentials = user.passkeys.map((pk) => ({
        id: pk.credentialID,
        transports: pk.transports ? (JSON.parse(pk.transports) as any) : undefined,
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: expectedRPID,
    allowCredentials,
    userVerification: "preferred",
  });

  const challengeKey = userEmail ? `passkey_auth_${userEmail}` : `passkey_auth_general_${options.challenge.slice(0, 16)}`;
  await prisma.verification.create({
    data: {
      identifier: challengeKey,
      value: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return { options, challengeKey };
}

export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  challengeKey: string
) {
  const storedChallenge = await prisma.verification.findFirst({
    where: { identifier: challengeKey },
  });

  if (!storedChallenge || storedChallenge.expiresAt < new Date()) {
    throw new Error("Authentication challenge expired or not found");
  }

  const passkey = await prisma.passkey.findUnique({
    where: { credentialID: response.id },
    include: { user: true },
  });

  if (!passkey) {
    throw new Error("Passkey not registered");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: storedChallenge.value,
    expectedOrigin: [expectedOrigin, "http://localhost:3080", "https://zyuuuukak1n.dev"],
    expectedRPID: expectedRPID,
    credential: {
      id: passkey.credentialID,
      publicKey: Buffer.from(passkey.publicKey, "base64"),
      counter: passkey.counter,
    },
  });

  if (!verification.verified) {
    throw new Error("Passkey verification failed");
  }

  // カウンター更新
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  await prisma.verification.deleteMany({
    where: { identifier: challengeKey },
  });

  return passkey.user;
}
