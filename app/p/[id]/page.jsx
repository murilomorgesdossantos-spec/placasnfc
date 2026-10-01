import { redirect } from 'next/navigation';

export default async function RedirecionamentoPlaca({ params }) {
  const { id } = await params;
  
  // O seu link real da planilha
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZWA_Yc_ffltk_pBWfJwz20LV24d7VjCWkOhnCCrRal-u674BhsremfORndmyAPyRXrlyZ7sQYyO3t/pub?gid=0&single=true&output=csv';

  let linkDestino = null;
  let erroNoGoogle = false;

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    const text = await res.text();

    const linhas = text.split('\n');

    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i].split(',');
      
      const rowId = colunas[0]?.trim();
      const rowDestino = colunas[1]?.trim();

      if (rowId === id) {
        linkDestino = rowDestino;
        break; 
      }
    }
  } catch (error) {
    // Se o Google Sheets estiver fora do ar ou o link falhar
    erroNoGoogle = true;
  }

  // IMPORTANTE: O redirect obrigatóriamente tem que ficar de fora do try...catch
  if (linkDestino && linkDestino.startsWith('http')) {
    redirect(linkDestino);
  }

  // TELAS DE AVISO (Para não dar erro 404)
  if (erroNoGoogle) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>Ocorreu um erro no servidor.</h2>
        <p>Não foi possível conectar ao banco de dados agora.</p>
      </div>
    );
  }

  // Se o ID não existe na planilha ou a célula do link está vazia
  return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2>Placa aguardando configuração</h2>
      <p>A placa ID <strong>{id}</strong> ainda não foi ativada pelo cliente.</p>
    </div>
  );
}