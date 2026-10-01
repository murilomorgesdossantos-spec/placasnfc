import { redirect } from 'next/navigation';

export default async function RedirecionamentoPlaca({ params }) {
  const { id } = params;
  
  // O link público do seu Google Sheets no formato CSV
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZWA_Yc_ffltk_pBWfJwz20LV24d7VjCWkOhnCCrRal-u674BhsremfORndmyAPyRXrlyZ7sQYyO3t/pub?gid=0&single=true&output=csv';

  try {
    // Faz o fetch salvando em cache por 60 segundos (deixa o sistema ultra rápido e protege o Google)
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    const text = await res.text();

    // Divide o arquivo CSV em linhas
    const linhas = text.split('\n');
    let linkDestino = null;

    // Começa no índice 1 para pular o cabeçalho e varre a planilha
    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i].split(',');
      
      const rowId = colunas[0]?.trim();
      const rowDestino = colunas[1]?.trim();

      // Se encontrar o ID exato na Coluna A
      if (rowId === id) {
        linkDestino = rowDestino;
        break; // Interrompe a busca na mesma hora para economizar processamento
      }
    }

    // Se achou um link válido, faz o redirecionamento invisível
    if (linkDestino && linkDestino.startsWith('http')) {
      redirect(linkDestino);
    } else {
      // ID existe na planilha mas o destino está vazio (placa em estoque) ou ID não existe
      redirect('https://morges.com.br/placa-nao-configurada');
    }

  } catch (error) {
    console.error("Erro ao processar a planilha:", error);
    redirect('https://morges.com.br/erro');
  }
}