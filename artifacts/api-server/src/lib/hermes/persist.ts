import { db } from "@workspace/db";
import {
  hermesAcoesProativasTable,
  hermesAdminInboxTable,
  hermesDescobertasGlobaisTable,
} from "@workspace/db/schema";

export async function persistDescoberta(
  agentId: string,
  descoberta: string,
  evidencia: Record<string, unknown>,
  importancia = 1,
): Promise<void> {
  await db.insert(hermesDescobertasGlobaisTable).values({
    agentId,
    descoberta,
    evidencia,
    importancia: Math.max(1, Math.min(5, importancia)),
  });
}

export async function persistAcaoProativa(
  agentId: string,
  tipo: string,
  descricao: string,
  payload?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await db.insert(hermesAcoesProativasTable).values({
    agentId,
    userId: userId ?? null,
    tipo,
    descricao,
    payload: payload ?? null,
    status: "pending",
  });
}

export async function insertAdminInbox(
  agentId: string,
  tipo: string,
  titulo: string,
  corpo: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await db.insert(hermesAdminInboxTable).values({
    agentId,
    tipo,
    titulo,
    corpo,
    payload: payload ?? null,
  });
}
