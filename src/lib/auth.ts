import { normalize as n, isMatch } from "./utils";
import { DEPARTAMENTOS, REPARTICOES, SECTORES } from "../constants/formOptions";

// Departments that do not have strict internal sector structure
const UNSTRUCTURED_DEPTS = [
  "Gabinete do Diretor-Geral",
  "Secretaria Executiva",
  "Unidade Gestora e Executora de Aquisições",
  "Departamento de Cooperação e Relações Exteriores",
  "Departamento de Controlo Técnico e de Qualidade",
  "Departamento Jurídico",
];

export const isStructuredDept = (deptName: string) => {
  return !UNSTRUCTURED_DEPTS.includes(deptName);
};

export const canAccessArea = (
  user: any,
  targetDir: string,
  targetDept: string,
  targetSector: string,
) => {
  if (!user) return false;
  
  // Super Boss, Admin, etc can see everything
  const role = (user.role || "").toLowerCase();
  const title = (user.title || user.cargo || user.cargoChefia || "").toLowerCase();
  const combinedRole = role + " " + title;
  
  if (
    combinedRole.includes("admin") ||
    combinedRole.includes("proprietario") ||
    combinedRole.includes("diretor geral") ||
    combinedRole.includes("director geral") ||
    combinedRole.includes("diretor-geral") ||
    user.email === "admin@isps.ac.mz"
  ) {
    return true;
  }

  const uDir = (user.direcao || "").toLowerCase().trim();
  const uDept = (user.departamento || "").toLowerCase().trim();
  const uSector = (user.setor || user.reparticao || "").toLowerCase().trim();
  
  // Create a combined list of all user areas to ensure we don't miss a match if data is stored in the wrong field
  const userAreas = [uDir, uDept, uSector].filter(Boolean);

  const tDir = (targetDir || "").toLowerCase().trim();
  const tDept = (targetDept || "").toLowerCase().trim();
  const tSector = (targetSector || "").toLowerCase().trim();

  // Diretores Centrais -> acessam Direções
  if (combinedRole.includes("diretor") || combinedRole.includes("director")) {
    if (tDir && userAreas.some(area => tDir.includes(area) || area.includes(tDir))) return true;
  }

  // Chefe de Departamento -> acessam Departamentos
  if (combinedRole.includes("chefe de departamento") || combinedRole.includes("departamento")) {
    if (tDept && userAreas.some(area => tDept.includes(area) || area.includes(tDept))) return true;
    // Fallback in case the activity was saved with the department name in the setor field
    if (tSector && userAreas.some(area => tSector.includes(area) || area.includes(tSector))) return true;
  }

  // Chefe de Reparticao -> acessam Reparticoes
  if (combinedRole.includes("chefe de repartição") || combinedRole.includes("chefe de reparticao") || combinedRole.includes("reparticao") || combinedRole.includes("repartição")) {
    if (tSector && userAreas.some(area => tSector.includes(area) || area.includes(tSector))) return true;
  }

  // Fallback genérico de correspondência exata para a área do utilizador
  // We match the most specific level the user belongs to, preventing them from seeing broader areas
  if (uSector && tSector) {
    if (tSector === uSector || tSector.includes(uSector) || uSector.includes(tSector)) return true;
  } else if (uDept && tDept) {
    if (tDept === uDept || tDept.includes(uDept) || uDept.includes(tDept)) return true;
  } else if (uDir && tDir) {
    if (tDir === uDir || tDir.includes(uDir) || uDir.includes(tDir)) return true;
  }

  // If activity is at department level (no sector) and user is in a sector of that department
  if (uSector && uDept && !tSector && tDept) {
     if (tDept === uDept || tDept.includes(uDept) || uDept.includes(tDept)) return true;
  }

  return false;
};

/**
 * Helper to get the numeric level of an activity status.
 */
export const getActivityStatusLevel = (status: string): number => {
  const s = (status || "").toLowerCase().trim();
  if (s === "reparticao") return 2;
  if (s === "departamento") return 3;
  if (s === "direcao") return 4;
  if (s === "planificacao" || s === "dpep_chefe" || s === "meritos") return 5;
  if (s === "institucional") return 6;
  return 1; // setorial, planeada, draft, etc.
};

/**
 * Helper to get the required status level for a user to see activities.
 */
export const getUserRequiredStatusLevel = (user: any): number => {
  if (!user) return 1;
  const title = (user.title || user.cargo || user.cargoChefia || "").toLowerCase();
  const dept = (user.departamento || "").toLowerCase();
  const role = (user.role || "").toLowerCase();

  const isDPEP =
    title.includes("dpep") ||
    dept.includes("dpep") ||
    role.includes("dpep") ||
    title.includes("planificação") ||
    dept.includes("planificação") ||
    role.includes("planificação") ||
    title.includes("planeamento") ||
    dept.includes("planeamento") ||
    role.includes("planeamento");

  const roles = getRoles(user.title || user.cargo || user.cargoChefia || "");

  if (roles.isDG || isDPEP) {
    return 5; // Top superiors: only see activities that have reached the "planificacao" status
  }
  if (roles.isDC) {
    return 4; // Diretores: only see activities that have reached the "direcao" status
  }
  if (roles.isCD) {
    return 3; // Chefes de Departamento: only see activities that have reached the "departamento" status
  }
  if (roles.isCR) {
    return 2; // Chefes de Repartição: only see activities that have reached the "reparticao" status
  }
  return 1; // Normal users can see activities at any level (including setorial)
};

/**
 * Filters activities based on user permissions.
 */
export const getAuthorizedActivities = (activities: any[], user: any) => {
  if (!activities) return [];
  if (!user) return activities;

  if (isSuperBossUser(user)) return activities;

  const role = (user.role || "").toLowerCase();
  const isSysAdmin =
    role === "admin" ||
    role === "administrador" ||
    role === "administrador do sistema" ||
    role === "administrador de sistema" ||
    role === "proprietario" ||
    role === "proprietário" ||
    user.isOwner === true ||
    (user.categoria || "").toLowerCase().includes("programador") ||
    (user.email || "").toLowerCase() === "admin@isps.ac.mz";

  const uEmail = (user.email || "").toLowerCase();

  return activities.filter((a) => {

    if (!a) return false;

    // As atividades sempre devem estar visíveis para o próprio criador
    const creator = (a.createdBy || a.emailCriador || "").toLowerCase();
    if (creator && creator === uEmail) return true;

    // Administrador de Sistema tem acesso total para fins de suporte e debug
    if (isSysAdmin) return true;

    // Se estiver tramitado para o gabinete/área atual do usuário, conceder acesso
    if (a.currentGabinete) {
      const uArea = (user.setor || user.reparticao || user.departamento || user.direcao || "").toLowerCase().trim();
      const aGabinete = a.currentGabinete.toLowerCase();
      if (uArea && (aGabinete.includes(uArea) || uArea.includes(aGabinete))) return true;
    }

    const aDir = (a.direcao || "").trim();
    const aDept = (a.departamento || "").trim();
    const aSector = (a.setor || a.reparticao || "").trim();

    
    const activityLevel = getActivityStatusLevel(a.status);
    const requiredLevel = getUserRequiredStatusLevel(user);
    
    // Only allow access if the activity has reached the status required by the user's hierarchy level
    if (activityLevel < requiredLevel) return false;

    return canAccessArea(user, aDir, aDept, aSector);
  });
};

/**
 * Determines the user's primary workspace area for dashboard redirection.
 */
export const getUserWorkspace = (user: any) => {
  if (user.areaDeAfetacao) return user.areaDeAfetacao;
  return (
    user.setor || user.reparticao || user.departamento || user.direcao || ""
  );
};

/**
 * Checks if a user is a boss (Director, Chief, etc.) based on their name/role.
 */
export const isBossUser = (userName: string = "") => {
  const norm = n(userName);
  return (
    norm.includes("chefe") ||
    norm.includes("diretor") ||
    norm.includes("director") ||
    norm.includes("coordenador") ||
    norm.includes("adjunto") ||
    norm.includes("secretaria") ||
    norm.includes("presidente") ||
    norm.includes("proprietario") ||
    norm.includes("administrador") ||
    norm.includes("responsavel") ||
    norm.includes("ugea") ||
    norm.includes("dpep")
  );
};

/**
 * Checks if a user is a Super Boss (Director General or System Admin).
 */
export const isSuperBossUser = (user: any) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  const title = (user.title || "").toLowerCase();
  const cargo = (user.cargo || "").toLowerCase();
  const cargoChefia = (user.cargoChefia || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const normName = n(user.name || "").replace(/\s+/g, "");

  if (
    role === "admin" ||
    role === "administrador" ||
    role === "administrador do sistema" ||
    role === "administrador de sistema" ||
    role === "proprietario" ||
    role === "proprietário" ||
    user.isOwner === true ||
    title === "administrador" ||
    title === "administrador do sistema" ||
    cargo === "administrador" ||
    cargo === "administrador do sistema" ||
    cargoChefia === "administrador" ||
    cargoChefia === "administrador do sistema"
  )
    return true;

  if (
    user.categoria === "Programador e Proprietário do Sistema" ||
    user.categoria === "Proprietário e Programador do Sistema" ||
    user.categoria === "Proprietario E Progrramador Do Sistema" ||
    user.cargo === "Programador e Proprietário do Sistema"
  )
    return true;

  const uNuit = (user.nuit || "").toString();
  if (uNuit === "108164611") return true;

  const lowName = (user.name || user.nome || "").toLowerCase();
  if (lowName.includes("franzissi") || lowName.includes("slaiter")) return true;

  return (
    normName.includes("diretorgeral") ||
    normName.includes("diretorsistema") ||
    normName.includes("administradorsistema") ||
    email === "admin@isps.ac.mz" ||
    email === "slaitertripas@gmail.com" ||
    user.name === "Administrador Sistema"
  );
};

/**
 * Common role checkers for UI conditional rendering.
 */
export const getRoles = (title: string = "") => {
  const norm = n(title);
  const t = norm.replace(/\s+/g, ""); // Normalized and space-less

  const isDG = t.includes("diretorgeral");
  const isDC =
    t.includes("diretorcentral") ||
    t.includes("diretordadivisao") ||
    t.includes("diretorda") ||
    t.includes("dicosser");
  const isCD =
    t.includes("chefedodepartamento") ||
    t.includes("chefededepartamento") ||
    t.includes("chefedaunidade") ||
    t === "chefedorh" ||
    t === "chefedefinancas" ||
    t === "chefededp" ||
    t === "chefedasg" ||
    t === "chefededtic" ||
    t === "chefededla" ||
    t === "chefededle" ||
    t === "chefededpa" ||
    t === "chefedodra" ||
    t === "chefedodae" ||
    t === "chefesecretariaexecutiva" ||
    t.includes("chefedeinfraestruturaemanutencao") ||
    t === "diretordocurso" ||
    t === "diretordecurso" ||
    t === "DPEP" ||
    t === "chefedoDPEP";
  const isAdjunto = t.includes("adjunto");
  const isCR =
    t.includes("chefedareparticao") ||
    t.includes("chefedereparticao") ||
    t === "diretordocurso" ||
    t === "diretordecurso";

  const isDICOSAFA_Dept =
    t.includes("departamentoderecursoshumanos") ||
    t.includes("departamentodefinancas") ||
    t.includes("departamentodepatrimonio") ||
    t.includes("secretariageral") ||
    t.includes("departamentotic") ||
    t.includes("departamentolardeestudantes") ||
    t.includes("departamentodeproducaoalimentar") ||
    t.includes("unidadegestoraeexecutoradeaquisicoes");

  const isPessoal = t.includes("reparticaodepessoal");

  return {
    isDG,
    isDC,
    isCD,
    isAdjunto,
    isCR,
    isPessoal,
    isDCC:
      t.includes("diretordocurso") ||
      t.includes("diretordoscursos") ||
      t === "diretordecurso",
    isBoss:
      t.includes("chefe") ||
      t.includes("diretor") ||
      t.includes("secretariaexecutiva") ||
      t.includes("adjunto"),
    isConsRep: t.includes("conselhoderepresentantes"),
    isConsAdm: t.includes("conselhoadministrativoedegestao"),
    isConsTec: t.includes("conselhotecnicoedequalidade"),
    isDICOSAFA_Dept,
    isGDG:
      t.includes("chefedo-gdg") ||
      t.includes("gabinetedodiretorgeral") ||
      t.includes("chefedodepartamentodegdg"),
  };
};

export const isPersonnelBoss = (user: any) => {
  if (!user) return false;
  const title =
    user.title || user.cargoChefia || user.cargo || user.reparticao || "";
  const roles = getRoles(title);
  const norm = n(title).replace(/\s+/g, "");
  return (
    (roles.isPessoal && roles.isCR) ||
    norm.includes("chefedereparticaodepessoal")
  );
};

export const isPatrimonioBossOrAdmin = (
  user: any,
  colaboradores?: any[],
  processos?: any[],
) => {
  if (!user) return false;
  if (isSuperBossUser(user)) return true;

  const email = (user.email || "").toLowerCase();
  if (
    email === "slaitertripas@gmail.com" ||
    email === "fttripas@gmail.com" ||
    email === "admin@isps.ac.mz"
  )
    return true;
  if (email.includes("gércio.chaibande") || email.includes("gercio.chaibande"))
    return true;

  const name = (user.name || "").toLowerCase();
  if (
    name.includes("gércio") ||
    name.includes("gercio") ||
    name.includes("chaibande")
  )
    return true;

  const role = (user.role || "").toUpperCase();
  const departamento = (user.departamento || "").toUpperCase();
  const cargo = (user.cargo || "").toUpperCase();
  const cargoChefia = (user.cargoChefia || "").toUpperCase();
  const title = (user.title || "").toUpperCase();

  const isPatriText = (str: string) =>
    str.includes("PATRIM") ||
    str.includes("CHEFE DE DP") ||
    str.includes("CHEFE DO DP") ||
    str.includes("CHEFE DE PATRIM") ||
    str.includes("REPARTIÇÃO DE E-PATRI");

  if (
    isPatriText(role) ||
    isPatriText(departamento) ||
    isPatriText(cargo) ||
    isPatriText(cargoChefia) ||
    isPatriText(title)
  ) {
    return true;
  }

  if (colaboradores && colaboradores.length > 0) {
    const colab = colaboradores.find(
      (c) =>
        (c.email &&
          user.email &&
          c.email.toLowerCase() === user.email.toLowerCase()) ||
        (c.nome &&
          user.name &&
          c.nome.toLowerCase() === user.name.toLowerCase()) ||
        (c.nuit && user.nuit && c.nuit === user.nuit),
    );
    if (colab) {
      if (
        (colab.departamento || "").toUpperCase().includes("PATRIM") &&
        (colab.cargo || colab.cargoChefia || "").toUpperCase().includes("CHEFE")
      ) {
        return true;
      }
      if (
        isPatriText((colab.departamento || "").toUpperCase()) ||
        isPatriText((colab.cargo || "").toUpperCase()) ||
        isPatriText((colab.cargoChefia || "").toUpperCase())
      ) {
        return true;
      }
    }
  }

  if (processos && processos.length > 0) {
    const proc = processos.find(
      (p) =>
        (p.email &&
          user.email &&
          p.email.toLowerCase() === user.email.toLowerCase()) ||
        (p.nome &&
          user.name &&
          p.nome.toLowerCase() === user.name.toLowerCase()) ||
        (p.nuit && user.nuit && p.nuit === user.nuit),
    );
    if (proc) {
      if (
        (proc.departamento || "").toUpperCase().includes("PATRIM") &&
        (proc.cargo || proc.cargoChefia || "").toUpperCase().includes("CHEFE")
      ) {
        return true;
      }
      if (
        isPatriText((proc.departamento || "").toUpperCase()) ||
        isPatriText((proc.cargo || "").toUpperCase()) ||
        isPatriText((proc.cargoChefia || "").toUpperCase())
      ) {
        return true;
      }
    }
  }

  return false;
};
