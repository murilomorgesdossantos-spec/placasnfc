import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIAS = {
  GOOGLE: "GL",
  WHATSAPP: "WH",
  INSTAGRAM: "IN",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  };
}

function resposta(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

function autorizado(request) {
  const chave = request.headers.get("X-Admin-Key");

  return (
    process.env.PAINEL_ADMIN_KEY &&
    chave === process.env.PAINEL_ADMIN_KEY
  );
}

function gerarCodigo(tamanho = 6) {
  // Sem 0/O e 1/I para evitar confusão visual.
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let resultado = "";

  for (let i = 0; i < tamanho; i++) {
    resultado += caracteres.charAt(
      Math.floor(Math.random() * caracteres.length)
    );
  }

  return resultado;
}

function categoriaPeloId(id) {
  if (id.startsWith("GL-")) return "GOOGLE";
  if (id.startsWith("WH-")) return "WHATSAPP";
  if (id.startsWith("IN-")) return "INSTAGRAM";

  return null;
}

function validarDestino(destino) {
  try {
    const url = new URL(destino);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/* =========================
   LISTAR
========================= */

export async function GET(request) {
  if (!autorizado(request)) {
    return resposta({ erro: "Não autorizado." }, 401);
  }

  try {
    const placas = [];

    for (const categoria of Object.keys(CATEGORIAS)) {
      const snapshot = await db
        .collection("PLACAS")
        .doc(categoria)
        .collection("links")
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data();

        placas.push({
          id: doc.id,
          categoria,
          cliente: data.cliente || "",
          destino: data.destino || "",
          ativo: data.ativo !== false,
          acessos: data.acessos || 0,
          criadoEm: data.criadoEm?.toDate?.()?.toISOString() || null,
        });
      });
    }

    placas.sort((a, b) => {
      return (b.criadoEm || "").localeCompare(a.criadoEm || "");
    });

    return resposta({ placas });
  } catch (error) {
    console.error(error);

    return resposta(
      { erro: "Erro ao carregar placas." },
      500
    );
  }
}

/* =========================
   CRIAR
========================= */

export async function POST(request) {
  if (!autorizado(request)) {
    return resposta({ erro: "Não autorizado." }, 401);
  }

  try {
    const body = await request.json();

    const categoria = body.categoria?.toUpperCase();
    const cliente = body.cliente?.trim();
    const destino = body.destino?.trim();

    if (!CATEGORIAS[categoria]) {
      return resposta({ erro: "Categoria inválida." }, 400);
    }

    if (!cliente) {
      return resposta({ erro: "Informe o cliente." }, 400);
    }

    if (!validarDestino(destino)) {
      return resposta({ erro: "URL de destino inválida." }, 400);
    }

    const prefixo = CATEGORIAS[categoria];

    let id;
    let referencia;

    // Evita colisão mesmo que seja extremamente improvável.
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      id = `${prefixo}-${gerarCodigo()}`;

      referencia = db
        .collection("PLACAS")
        .doc(categoria)
        .collection("links")
        .doc(id);

      const existente = await referencia.get();

      if (!existente.exists) break;

      referencia = null;
    }

    if (!referencia) {
      return resposta(
        { erro: "Não foi possível gerar um ID único." },
        500
      );
    }

    await referencia.set({
      cliente,
      destino,
      ativo: true,
      acessos: 0,
      criadoEm: FieldValue.serverTimestamp(),
    });

    return resposta(
      {
        sucesso: true,
        placa: {
          id,
          categoria,
          cliente,
          destino,
          ativo: true,
          acessos: 0,
          url: `https://morges.com.br/p/${id}`,
        },
      },
      201
    );
  } catch (error) {
    console.error(error);

    return resposta({ erro: "Erro ao criar placa." }, 500);
  }
}

/* =========================
   EDITAR
========================= */

export async function PUT(request) {
  if (!autorizado(request)) {
    return resposta({ erro: "Não autorizado." }, 401);
  }

  try {
    const body = await request.json();

    const id = body.id?.toUpperCase();
    const categoria = categoriaPeloId(id || "");

    if (!categoria) {
      return resposta({ erro: "ID inválido." }, 400);
    }

    const referencia = db
      .collection("PLACAS")
      .doc(categoria)
      .collection("links")
      .doc(id);

    const snapshot = await referencia.get();

    if (!snapshot.exists) {
      return resposta({ erro: "Placa não encontrada." }, 404);
    }

    const alteracoes = {};

    if (typeof body.cliente === "string") {
      alteracoes.cliente = body.cliente.trim();
    }

    if (typeof body.destino === "string") {
      if (!validarDestino(body.destino.trim())) {
        return resposta({ erro: "URL inválida." }, 400);
      }

      alteracoes.destino = body.destino.trim();
    }

    if (typeof body.ativo === "boolean") {
      alteracoes.ativo = body.ativo;
    }

    await referencia.update(alteracoes);

    return resposta({ sucesso: true });
  } catch (error) {
    console.error(error);

    return resposta({ erro: "Erro ao editar placa." }, 500);
  }
}

/* =========================
   EXCLUIR
========================= */

export async function DELETE(request) {
  if (!autorizado(request)) {
    return resposta({ erro: "Não autorizado." }, 401);
  }

  try {
    const body = await request.json();

    const id = body.id?.toUpperCase();
    const categoria = categoriaPeloId(id || "");

    if (!categoria) {
      return resposta({ erro: "ID inválido." }, 400);
    }

    await db
      .collection("PLACAS")
      .doc(categoria)
      .collection("links")
      .doc(id)
      .delete();

    return resposta({ sucesso: true });
  } catch (error) {
    console.error(error);

    return resposta({ erro: "Erro ao excluir placa." }, 500);
  }
}