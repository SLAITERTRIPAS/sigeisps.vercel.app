/**
 * Heuristics to determine sector allocation based on activity metadata
 */
export function determineSectorAllocation(
  activity: any,
  colaboradoresList: any[] = [],
) {
  const resp = String(activity.responsavel || "")
    .trim()
    .toLowerCase();
  const titleText = String(activity.title || "").toLowerCase();
  const rubricaText = String(activity.rubrica || "").toLowerCase();
  const necText = String(activity.necessidade || "").toLowerCase();

  // 1. Tentar fazer o cruzamento pelo nome do responsável com a lista de colaboradores
  if (resp && resp !== "-" && resp !== "nenhum") {
    const matchedColab = colaboradoresList.find((c) => {
      const colabName = (c.nome || "").toLowerCase().trim();
      return colabName.includes(resp) || resp.includes(colabName);
    });

    if (matchedColab) {
      const dir = matchedColab.direcao || "";
      const dept = matchedColab.departamento || "";
      const rep =
        matchedColab.reparticao ||
        matchedColab.setor ||
        matchedColab.areaDeAfetacao ||
        "";

      if (dir || dept || rep) {
        return {
          direcao: dir || "Órgão de Direção e Gestão",
          departamento: dept || "Geral",
          setor: rep || "Sectores Gerais",
        };
      }
    }
  }

  // 2. Classificação Inteligente por palavras-chave
  const allText = `${titleText} ${rubricaText} ${necText}`;

  // Centro de Incubação de Empresas (CIE)
  if (
    allText.includes("cie") ||
    allText.includes("incubadora") ||
    allText.includes("incubação") ||
    allText.includes("incubacao") ||
    allText.includes("empreendedorismo") ||
    allText.includes("negócio") ||
    allText.includes("thaka") ||
    allText.includes("rentabilizar")
  ) {
    return {
      direcao: "Centro de Incubação de Empresas",
      departamento:
        "Departamento de práticas de geração de negócio e desenvolvimento empresarial (DPGNDE)",
      setor: "Geral",
    };
  }

  // Divisão de Engenharia
  if (
    allText.includes("engenharia") ||
    allText.includes("laboratório") ||
    allText.includes("pesquisa") ||
    allText.includes("extensão") ||
    allText.includes("elétrica") ||
    allText.includes("mecânica") ||
    allText.includes("civil")
  ) {
    return {
      direcao: "Divisão de Engenharia",
      departamento: "Departamento de Pesquisa e Extensão",
      setor: "Repartição de Pesquisa",
    };
  }

  // TIC
  if (
    allText.includes("tic") ||
    allText.includes("informática") ||
    allText.includes("internet") ||
    allText.includes("software")
  ) {
    return {
      direcao:
        "Direção de Coordenação de Serviços de Administração, Finanças e de Apoio (DICOSAFA)",
      departamento:
        "Departamento de Tecnologias de Informação e Comunicação (DTIC)",
      setor: "Setor de Sistemas e Redes",
    };
  }

  // Default
  return {
    direcao:
      "Direção de Coordenação de Serviços de Administração, Finanças e de Apoio (DICOSAFA)",
    departamento: "Geral",
    setor: "Sectores Gerais",
  };
}
