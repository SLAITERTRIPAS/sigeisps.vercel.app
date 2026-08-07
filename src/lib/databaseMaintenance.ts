import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  getDirectionAbbreviation,
  getDepartmentAbbreviation,
  getActivityInitials,
} from "./utils";

export const databaseMaintenance = {
  /**
   * Remove atividades duplicadas na base de dados (matrix_activities) e corrige
   * a ordem de numeração sequencial das atividades (no, numeroDirecao, codigoAtividade)
   * sem repetições ou saltos (gaps).
   */
  async removeDuplicateActivitiesAndFixNumbering() {
    console.log(
      "Iniciando remoção de duplicatas e correção da numeração das atividades...",
    );
    try {
      const colRef = collection(db, "matrix_activities");
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) {
        console.log("Nenhuma atividade encontrada em matrix_activities.");
        return { deletedCount: 0, updatedCount: 0 };
      }

      const rawDocs = snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as any),
      }));

      // 1. Identificar Duplicatas
      const seen = new Set<string>();
      const duplicatesIds: string[] = [];
      const uniqueDocs: any[] = [];

      const normalize = (str: string) =>
        String(str || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ");

      rawDocs.forEach((act) => {
        const title = normalize(
          act.nomeAtividade || act.title || act.designacao || "",
        );
        const direction = normalize(act.direcao || act.unidadeOrganica || "");
        const department = normalize(act.departamento || "");
        const rubrica = normalize(act.rubrica || "");
        const total = Number(act.valorTotal || act.total || 0);
        const status = normalize(act.status || "");
        const year = String(act.ano || act.year || act.selectedYear || "2027");

        const key = `${title}|${direction}|${department}|${rubrica}|${total}|${status}|${year}`;

        if (seen.has(key)) {
          duplicatesIds.push(act.id);
        } else {
          seen.add(key);
          uniqueDocs.push(act);
        }
      });

      // 2. Apagar Duplicatas do Firestore
      let deletedCount = 0;
      if (duplicatesIds.length > 0) {
        console.log(
          `Encontradas ${duplicatesIds.length} atividades duplicadas. Deletando...`,
        );
        for (let i = 0; i < duplicatesIds.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = duplicatesIds.slice(i, i + 500);
          chunk.forEach((id) => {
            batch.delete(doc(db, "matrix_activities", id));
            deletedCount++;
          });
          await batch.commit();
        }
        console.log(`${deletedCount} duplicatas excluídas da base de dados.`);
      }

      // 3. Reordenar Atividades Únicas Restantes
      const getDirPriority = (dir: string): number => {
        const d = String(dir || "").toUpperCase();
        if (
          d.includes("GABINETE DO DIRETOR-GERAL") ||
          d.includes("GABINETE DO DIRETOR GERAL") ||
          d.includes("GABINETE") ||
          d.includes("DIRETOR-GERAL") ||
          d.includes("DIRETOR GERAL")
        )
          return 1;
        if (
          d.includes("ENGENHARIA") ||
          d.includes("DIVISÃO DE ENGENHARIA") ||
          d.includes("DIVISAO DE ENGENHARIA")
        )
          return 2;
        if (
          d.includes("INCUBAÇÃO") ||
          d.includes("INCUBACAO") ||
          d.includes("CENTRO DE INCUBAÇÃO") ||
          d.includes("CENTRO DE INCUBACAO") ||
          d.includes("CIE")
        )
          return 3;
        if (
          d.includes("DICOSAFA") ||
          d.includes("ADMINISTRAÇÃO") ||
          d.includes("ADMINISTRACAO")
        )
          return 4;
        if (
          d.includes("DICOSSER") ||
          d.includes("ACADÉMICOS") ||
          d.includes("ACADEMICOS")
        )
          return 5;
        return 100;
      };

      const sortedDocs = [...uniqueDocs].sort((a, b) => {
        const dirA = (a.direcao || a.unidadeOrganica || "").toString();
        const dirB = (b.direcao || b.unidadeOrganica || "").toString();
        const prioA = getDirPriority(dirA);
        const prioB = getDirPriority(dirB);
        if (prioA !== prioB) return prioA - prioB;

        const compDir = dirA.localeCompare(dirB);
        if (compDir !== 0) return compDir;

        const deptA = String(a.departamento || "");
        const deptB = String(b.departamento || "");
        const compDept = deptA.localeCompare(deptB);
        if (compDept !== 0) return compDept;

        const titleA = String(a.nomeAtividade || a.title || a.designacao || "");
        const titleB = String(b.nomeAtividade || b.title || b.designacao || "");
        return titleA.localeCompare(titleB);
      });

      // 4. Renumerar e Atualizar na Base de Dados de Forma Perfeita e Contínua
      const directionCounters: Record<string, number> = {};
      const updates = sortedDocs.map((act, idx) => {
        const newNo = String(idx + 1).padStart(3, "0");

        const dirKey = (act.direcao || "SEM DIREÇÃO").toUpperCase();
        if (!directionCounters[dirKey]) directionCounters[dirKey] = 0;
        directionCounters[dirKey]++;
        const newNumeroDirecao = String(directionCounters[dirKey]).padStart(
          3,
          "0",
        );

        const dirInitials = getDirectionAbbreviation(
          act.direcao || act.unidadeOrganica || "ISPS",
        ).toUpperCase();
        const deptInitials = getDepartmentAbbreviation(
          act.departamento,
        ).toUpperCase();
        const actInitials = getActivityInitials(
          act.nomeAtividade || act.title || act.designacao || "",
        );

        const newCode = [
          dirInitials !== "-" ? dirInitials : "ISPS",
          deptInitials !== "-" ? deptInitials : "Geral",
          newNo,
          actInitials,
        ]
          .filter(Boolean)
          .join("/");

        return {
          id: act.id,
          data: {
            no: newNo,
            numeroAtividade: newNo,
            nAtividade: newNo,
            codigoAtividade: newCode,
            referencia: newCode,
            numeroDirecao: newNumeroDirecao,
          },
        };
      });

      // Executa as atualizações em lotes de 500
      for (let i = 0; i < updates.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = updates.slice(i, i + 500);
        chunk.forEach((update) => {
          const docRef = doc(db, "matrix_activities", update.id);
          batch.set(docRef, update.data, { merge: true });
        });
        await batch.commit();
      }

      // A limpeza de cache local agora é gerida pela lógica de fusão do firestoreService
      // para evitar perda de dados não sincronizados (local_)
      console.log(
        `Renumeração e exclusão concluídas. Deletadas: ${deletedCount}. Atualizadas: ${sortedDocs.length}`,
      );
      return { deletedCount, updatedCount: sortedDocs.length };
    } catch (err) {
      console.error("Erro ao remover duplicatas e renumerar atividades:", err);
      throw err;
    }
  },

  /**
   * Executa a limpeza específica de departamentos e atividades solicitada pelo usuário
   */
  async cleanupDatabaseForUser() {
    console.log(
      "Iniciando limpeza e exclusão de departamentos e atividades solicitadas pelo usuário...",
    );

    // Coleções para limpar atividades
    const activityCollections = ["actividades", "matrix_activities"];
    let deletedActivitiesCount = 0;

    for (const colName of activityCollections) {
      try {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        if (!snapshot.empty) {
          const batch = writeBatch(db);
          let colDeletedCount = 0;

          snapshot.docs.forEach((document) => {
            const data = document.data() || {};
            const dept = String(data.departamento || "")
              .trim()
              .toUpperCase();
            const sector = String(data.setor || "")
              .trim()
              .toUpperCase();
            const rep = String(data.reparticao || "")
              .trim()
              .toUpperCase();
            const dir = String(data.direcao || "")
              .trim()
              .toUpperCase();
            const title = String(data.title || data.designacao || "")
              .trim()
              .toUpperCase();

            let shouldDelete = false;

            // 1. "excluir o DEPARTAMENTO DAI e todas as suas atividades"
            if (
              dept === "DAI" ||
              sector === "DAI" ||
              rep === "DAI" ||
              dir === "DAI" ||
              dept.includes("AUDITORIA INTERNA")
            ) {
              shouldDelete = true;
            }

            // 2. "excluir todas as atividade que estao na direcao geral, mantedo as atividade da UGEA"
            const isDirecaoGeral =
              dir === "DIREÇÃO GERAL" ||
              dir === "DIREÇÃO-GERAL" ||
              dir === "GDG" ||
              dir.includes("DIREÇÃO GERAL");
            const isUGEA =
              dept === "UGEA" ||
              sector === "UGEA" ||
              rep === "UGEA" ||
              title.includes("UGEA");
            if (isDirecaoGeral && !isUGEA) {
              shouldDelete = true;
            }

            // 3. "EXCLUIR Serviços Gerais"
            const isServicosGerais =
              dept === "SERVIÇOS GERAIS" ||
              dept === "SERVICOS GERAIS" ||
              sector === "SERVIÇOS GERAIS" ||
              sector === "SERVICOS GERAIS" ||
              rep === "SERVIÇOS GERAIS" ||
              rep === "SERVICOS GERAIS" ||
              dir === "SERVIÇOS GERAIS" ||
              dir === "SERVICOS GERAIS";
            if (isServicosGerais) {
              shouldDelete = true;
            }

            // 4. "eXCLUIR TODAS AS ATIVIDADES DO DPEP"
            const isDPEP =
              dept === "DPEP" ||
              sector === "DPEP" ||
              rep === "DPEP" ||
              dept.includes("PLANIFICAÇÃO") ||
              dept.includes("PLANIFICACAO") ||
              dept.includes("ESTUDOS E PROJETOS") ||
              sector.includes("PLANIFICAÇÃO") ||
              sector.includes("PLANIFICACAO");
            if (isDPEP) {
              shouldDelete = true;
            }

            if (shouldDelete) {
              batch.delete(doc(db, colName, document.id));
              colDeletedCount++;
            }
          });

          if (colDeletedCount > 0) {
            await batch.commit();
            deletedActivitiesCount += colDeletedCount;
            console.log(
              `Removidos ${colDeletedCount} documentos de ${colName}`,
            );
          }
        }
      } catch (err) {
        console.error(`Erro ao limpar atividades na coleção ${colName}:`, err);
      }
    }

    // Limpar colaboradores e usuários de DAI, Serviços Gerais se houver
    const entityCollections = ["colaboradores", "users"];
    let deletedEntitiesCount = 0;

    for (const colName of entityCollections) {
      try {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        if (!snapshot.empty) {
          const batch = writeBatch(db);
          let colDeletedCount = 0;

          snapshot.docs.forEach((document) => {
            const data = document.data() || {};
            const dept = String(data.departamento || "")
              .trim()
              .toUpperCase();
            const sector = String(data.setor || "")
              .trim()
              .toUpperCase();
            const dir = String(data.direcao || "")
              .trim()
              .toUpperCase();

            let shouldDelete = false;

            // Excluir de DAI
            if (
              dept === "DAI" ||
              sector === "DAI" ||
              dir === "DAI" ||
              dept.includes("AUDITORIA INTERNA")
            ) {
              shouldDelete = true;
            }

            // Excluir de Serviços Gerais
            const isServicosGerais =
              dept === "SERVIÇOS GERAIS" ||
              dept === "SERVICOS GERAIS" ||
              sector === "SERVIÇOS GERAIS" ||
              sector === "SERVICOS GERAIS" ||
              dir === "SERVIÇOS GERAIS" ||
              dir === "SERVICOS GERAIS";
            if (isServicosGerais) {
              shouldDelete = true;
            }

            if (shouldDelete) {
              batch.delete(doc(db, colName, document.id));
              colDeletedCount++;
            }
          });

          if (colDeletedCount > 0) {
            await batch.commit();
            deletedEntitiesCount += colDeletedCount;
            console.log(
              `Removidos ${colDeletedCount} colaboradores/usuários de ${colName}`,
            );
          }
        }
      } catch (err) {
        console.error(`Erro ao limpar coleção ${colName}:`, err);
      }
    }

    // A limpeza de cache local agora é gerida de forma segura pela lógica de fusão do firestoreService
    // preservando itens com prefixo 'local_' que ainda não foram sincronizados.
    console.log(
      `Limpeza concluída! Atividades deletadas: ${deletedActivitiesCount}. Colaboradores/Usuários deletados: ${deletedEntitiesCount}`,
    );
    return { deletedActivitiesCount, deletedEntitiesCount };
  },

  /**
   * Limpa uma coleção inteira (em lotes para evitar problemas de quota/performance)
   */
  async clearCollection(collectionName: string) {
    console.log(`Iniciando limpeza da coleção: ${collectionName}`);
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.log(`Coleção ${collectionName} já está vazia.`);
      return 0;
    }

    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
      count++;
    });

    await batch.commit();
    console.log(
      `Limpeza concluída: ${count} documentos removidos de ${collectionName}`,
    );
    return count;
  },

  /**
   * Limpa todos os dados de atividades e fluxos de teste do sistema,
   * preservando estritamente a lista de colaboradores e contas de utilizador.
   */
  async fullSystemReset() {
    const collectionsToClear = [
      "matrix_activities",
      "actividades",
      "plano_actividades",
      "plan_schedules",
      "calendar_events",
      "expedientes",
      "notes",
      "service_requests",
      "archive_documents",
      "bolsas",
      "financial_data",
      "materiais_bens",
      "suppliers",
      "library_visits",
      "library_books",
      "messages",
      "accessAlerts",
      "drafts",
      "processos",
      "processos_individuais",
      "monografia",
      "reports",
      "institucional_plans",
      "signatures",
      "efetivo_escolar",
      "alunos",
      "matriculas",
      "alocacoes_docentes",
      "turmas",
      "disciplinas_academicas",
      "espacos_fisicos",
      "exames",
      "atendimentos_estudantis",
      "colaboradores_formacao",
      "assiduidade",
      "movimentos_economato",
      "inventarios_patrimoniais",
      "requisicoes_internas",
      "documentos_normativos",
      "configuracoes",
      "tetos_orcamentais",
      "produtos_unificados",
      "balanco_config",
    ];

    const results = await Promise.all(
      collectionsToClear.map((col) => this.clearCollection(col)),
    );

    // Limpar apenas caches específicos de UI, preservando dados de coleções principais
    try {
      Object.keys(localStorage).forEach((k) => {
        if (
          k.startsWith("sigep_dept_activities_") ||
          k.startsWith("teto_atribuido_") ||
          k.startsWith("mono_") ||
          k === "sigep_unified_products" ||
          k === "sigep_deleted_products" ||
          k === "isps_balanco_logo"
        ) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn("Aviso ao limpar cache local de teste:", e);
    }

    const totalRemoved = results.reduce((acc, curr) => acc + curr, 0);
    return {
      totalRemoved,
      details: collectionsToClear.map((col, i) => ({
        collection: col,
        count: results[i],
      })),
    };
  },
};
