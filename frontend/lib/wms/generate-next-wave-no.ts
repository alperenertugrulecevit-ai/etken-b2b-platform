import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

const WAVE_PREFIX = "WAVE";
const WAVE_DIGIT_COUNT = 6;

type PrismaExecutor =
  | PrismaClient
  | Prisma.TransactionClient;

export async function generateNextWaveNo(
  database: PrismaExecutor
) {
  const rows = await database.$queryRaw<
    Array<{ value: bigint }>
  >`
    SELECT nextval('"WaveNumberSeq"') AS value
  `;

  const rawValue = rows[0]?.value;

  if (rawValue === undefined) {
    throw new Error(
      "Wave numarası üretilemedi."
    );
  }

  const nextNumber = Number(rawValue);

  if (
    !Number.isSafeInteger(nextNumber) ||
    nextNumber < 1
  ) {
    throw new Error(
      "Wave numarası üretilemedi."
    );
  }

  return `${WAVE_PREFIX}${String(
    nextNumber
  ).padStart(WAVE_DIGIT_COUNT, "0")}`;
}