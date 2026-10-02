import { redirect, notFound } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RedirectPage({ params }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const normalizedId = id.toUpperCase();

  let categoria;

  if (normalizedId.startsWith("GL-")) {
    categoria = "GOOGLE";
  } else if (normalizedId.startsWith("WH-")) {
    categoria = "WHATSAPP";
  } else if (normalizedId.startsWith("IN-")) {
    categoria = "INSTAGRAM";
  } else {
    notFound();
  }

  const ref = db
    .collection("PLACAS")
    .doc(categoria)
    .collection("links")
    .doc(normalizedId);

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    notFound();
  }

  const data = snapshot.data();

  if (!data?.ativo || !data?.destino) {
    notFound();
  }

  // Valida a URL
  let url;

  try {
    url = new URL(data.destino);
  } catch {
    notFound();
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    notFound();
  }

  // CONTADOR DE ACESSOS
  await ref.update({
    acessos: FieldValue.increment(1),
    ultimoAcesso: FieldValue.serverTimestamp(),
  });

  // Redireciona
  redirect(url.toString());
}