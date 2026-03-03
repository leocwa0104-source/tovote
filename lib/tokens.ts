import prisma from '@/lib/prisma';

export const generateVerificationToken = async (email: string) => {
  // Generate a random 6-digit code
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  // Set expiration to 15 minutes
  const expires = new Date(new Date().getTime() + 15 * 60 * 1000);

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email }
  });

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    }
  });

  return verificationToken;
};

export const verifyToken = async (email: string, token: string) => {
    const existingToken = await prisma.verificationToken.findFirst({
        where: { identifier: email, token }
    });

    if (!existingToken) {
        return { success: false, error: "Invalid token" };
    }

    if (new Date() > existingToken.expires) {
        return { success: false, error: "Token expired" };
    }

    // Delete token after successful verification
    await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } }
    });

    return { success: true };
}
