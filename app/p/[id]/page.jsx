import { redirect } from 'next/navigation';

export default async function RedirecionamentoPlaca({ params }) {
  // CORREÇÃO AQUI: No Next.js 15, é obrigatório usar 'await' nos params
  const { id } = await params;
  
  // O link público do seu Google Sheets no formato CSV
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZWA_Yc_ffltk_pBWfJwz20LV24d7VjCWkOhnCCrRal-u674BhsremfORndmyAPyRXrlyZ7sQYyO3t/pub?gid=0&single=true&output=csv';

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    const text = await res.text();

    const linhas = text.split('\n');
    let linkDestino = null;

    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i].split(',');
      
      const rowId = colunas[0]?.trim();
      const rowDestino = colunas[1]?.trim();

      if (rowId === id) {
        linkDestino = rowDestino;
        break; 
      }
    }

    if (linkDestino && linkDestino.startsWith('http')) {
      redirect(linkDestino);
    } else {
      // Redireciona para a página de erro se o ID não existir
      redirect('https://morges.com.br/placa-nao-configurada');
    }

  } catch (error) {
    console.error("Erro ao processar a planilha:", error);
    redirect('https://morges.com.br/erro');
  }
}