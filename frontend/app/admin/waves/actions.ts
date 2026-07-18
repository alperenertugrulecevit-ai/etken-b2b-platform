"use server";

import {
  WavePriority,
  WaveType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type SequenceResult = {
  value: bigint;
};

function parseOptionalDate(
  value: FormDataEntryValue | null
) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

async function generateNextWaveNo() {
  const sequenceResult =
    await prisma.$queryRaw<SequenceResult[]>`
      SELECT nextval('wavenumberseq') AS value
    `;

  const nextValue = sequenceResult[0]?.value;

  if (nextValue === undefined) {
    throw new Error(
      "Wave numarası üretilemedi."
    );
  }

  return `W${nextValue
    .toString()
    .padStart(6, "0")}`;
}

export async function createWaveAction(
  formData: FormData
) {
  const nameValue = formData.get("name");
  const typeValue = formData.get("type");
  const priorityValue = formData.get("priority");
  const notesValue = formData.get("notes");
  const createdByValue = formData.get("createdBy");

  const name =
    typeof nameValue === "string" &&
    nameValue.trim() !== ""
      ? nameValue.trim()
      : null;

  const notes =
    typeof notesValue === "string" &&
    notesValue.trim() !== ""
      ? notesValue.trim()
      : null;

  const createdBy =
    typeof createdByValue === "string" &&
    createdByValue.trim() !== ""
      ? createdByValue.trim()
      : null;

  const type =
    typeof typeValue === "string" &&
    Object.values(WaveType).includes(
      typeValue as WaveType
    )
      ? (typeValue as WaveType)
      : WaveType.MIXED;

  const priority =
    typeof priorityValue === "string" &&
    Object.values(WavePriority).includes(
      priorityValue as WavePriority
    )
      ? (priorityValue as WavePriority)
      : WavePriority.NORMAL;

  const plannedStartAt = parseOptionalDate(
    formData.get("plannedStartAt")
  );

  const plannedFinishAt = parseOptionalDate(
    formData.get("plannedFinishAt")
  );

  if (
    plannedStartAt &&
    plannedFinishAt &&
    plannedFinishAt < plannedStartAt
  ) {
    throw new Error(
      "Planlanan bitiş tarihi başlangıç tarihinden önce olamaz."
    );
  }

  const waveNo = await generateNextWaveNo();

  const wave = await prisma.wave.create({
    data: {
      waveNo,
      name,
      type,
      priority,
      status: "DRAFT",
      plannedStartAt,
      plannedFinishAt,
      notes,
      createdBy,
      updatedBy: createdBy,
    },
  });

  revalidatePath("/admin/waves");

  redirect(`/admin/waves?created=${wave.id}`);
}