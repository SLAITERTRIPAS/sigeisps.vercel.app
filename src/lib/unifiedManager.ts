import { PRODUTOS_POR_NECESSIDADE, ProdutoMercado } from "../constants/formOptions";
import { firestoreService } from "./firestoreService";

export interface UnifiedProduct extends ProdutoMercado {
  id?: string;
  updatedAt?: string;
  rubrica?: string;
  necessidade?: string;
}

function getRubricaForNecessidade(nec: string): string {
  const lower = (nec || "").toLowerCase();
  if (lower.includes("combustível") || lower.includes("material") || lower.includes("fardamento") || lower.includes("medicamento") || lower.includes("género") || lower.includes("ferramenta") || lower.includes("sementes") || lower.includes("bandeira") || lower.includes("software") || lower.includes("bens") || lower.includes("121")) {
    return "Bens - 121";
  }
  if (lower.includes("comunicação") || lower.includes("passagem") || lower.includes("renda") || lower.includes("manutenção") || lower.includes("transporte") || lower.includes("seguro") || lower.includes("representação") || lower.includes("festividade") || lower.includes("água") || lower.includes("energia") || lower.includes("limpeza") || lower.includes("segurança") || lower.includes("serviços") || lower.includes("122")) {
    return "Serviços - 122";
  }
  if (lower.includes("ajuda") || lower.includes("subsídio") || lower.includes("remuneração") || lower.includes("pessoal") || lower.includes("contratação") || lower.includes("112")) {
    return "Demais despesas com o pessoal - 112";
  }
  if (lower.includes("bolsa") || lower.includes("transferência") || lower.includes("1434")) {
    return "Demais transferências a famílias - 1434";
  }
  if (lower.includes("retractivo") || lower.includes("exercício") || lower.includes("findo") || lower.includes("161") || lower.includes("12")) {
    return "Exercícios findos - 12";
  }
  return "Bens - 121";
}

export function toSingularWord(word: string): string {
  if (!word || word.length <= 3) return word;
  const lower = word.toLowerCase();
  const exceptions = ["lápis", "póstris", "pires", "vírus", "ônibus", "autocarro", "arroz", "gás", "pratos", "óculos"];
  if (exceptions.includes(lower)) return word;

  if (lower.endsWith("ões")) return word.slice(0, -3) + "ão";
  if (lower.endsWith("ães")) return word.slice(0, -3) + "ão";
  if (lower.endsWith("ãos")) return word.slice(0, -1);
  if (lower.endsWith("éis") || lower.endsWith("eis")) return word.slice(0, -3) + "el";
  if (lower.endsWith("ais")) return word.slice(0, -3) + "al";
  if (lower.endsWith("ois")) return word.slice(0, -3) + "ol";
  if (lower.endsWith("uis")) return word.slice(0, -3) + "ul";
  if (lower.endsWith("ores") || lower.endsWith("eres") || lower.endsWith("ires")) return word.slice(0, -2);
  if (lower.endsWith("ns")) return word.slice(0, -2) + "m";
  if (lower.endsWith("s") && !lower.endsWith("is") && !lower.endsWith("us") && !lower.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

export function toSingularProductName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  const words = trimmed.split(" ");
  if (words.length === 0) return trimmed;
  words[0] = toSingularWord(words[0]);
  for (let i = 1; i < words.length; i++) {
    if (["e", "de", "do", "da", "dos", "das", "para", "com", "em"].includes(words[i].toLowerCase())) continue;
    words[i] = toSingularWord(words[i]);
  }
  const result = words.join(" ");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function getDeletedProductKeys(): Set<string> {
  try {
    const saved = localStorage.getItem("sigep_deleted_products");
    if (saved) {
      const arr: string[] = JSON.parse(saved);
      return new Set(arr.map((k) => k.trim().toLowerCase()));
    }
  } catch (e) {
    console.error("Error reading deleted products:", e);
  }
  return new Set();
}

export function deleteUnifiedProduct(nome: string) {
  try {
    const singularName = toSingularProductName(nome);
    const key = singularName.trim().toLowerCase();
    const docId = `prod_${key}`.replace(/[^a-zA-Z0-9_]/g, "_");
    
    const deleted = getDeletedProductKeys();
    deleted.add(key);
    localStorage.setItem("sigep_deleted_products", JSON.stringify(Array.from(deleted)));

    const saved = localStorage.getItem("sigep_unified_products");
    if (saved) {
      const parsed: UnifiedProduct[] = JSON.parse(saved);
      const filtered = parsed.filter((p) => toSingularProductName(p.nome).trim().toLowerCase() !== key);
      localStorage.setItem("sigep_unified_products", JSON.stringify(filtered));
    }

    firestoreService.produtosUnificados.delete(docId).catch((err) => {
      console.warn("Aviso ao eliminar produto no Firestore:", err);
    });
  } catch (e) {
    console.error("Error deleting product:", e);
  }
}

export async function getUnifiedProducts(): Promise<UnifiedProduct[]> {
  const map = new Map<string, UnifiedProduct>();
  const deletedKeys = getDeletedProductKeys();

  // 1. Fetch from Firestore (primary source)
  try {
    const remoteProducts = await firestoreService.produtosUnificados.get();
    remoteProducts.forEach((p) => {
        if (p && p.nome) {
          const singularName = toSingularProductName(p.nome);
          const key = singularName.trim().toLowerCase();
          if (!deletedKeys.has(key)) {
            map.set(key, {
              nome: singularName,
              preco: Number(p.preco) || 0,
              unidade: p.unidade || "Unidade",
              especificacao: p.especificacao || "",
              rubrica: p.rubrica || "Bens - 121",
              necessidade: p.necessidade || "Geral",
              updatedAt: p.updatedAt,
            });
          }
        }
    });
  } catch (e) {
    console.error("Error fetching unified products from Firestore:", e);
  }

  // 2. Merge existing local logic
  Object.entries(PRODUTOS_POR_NECESSIDADE).forEach(([necessidade, prods]) => {
    const rubrica = getRubricaForNecessidade(necessidade);
    prods.forEach((p) => {
      const singularName = toSingularProductName(p.nome);
      const key = singularName.trim().toLowerCase();
      if (!deletedKeys.has(key) && !map.has(key)) {
        map.set(key, {
          nome: singularName,
          preco: p.preco || 0,
          unidade: p.unidade || "Unidade",
          especificacao: p.especificacao || "",
          rubrica: rubrica,
          necessidade: necessidade,
        });
      }
    });
  });

  // ... (localStorage harvesting logic restored)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const keyName = localStorage.key(i);
      if (keyName && (keyName.includes("activities") || keyName.includes("actividades") || keyName.includes("matrix") || keyName.includes("dept"))) {
        const itemVal = localStorage.getItem(keyName);
        if (itemVal) {
          const parsedActs = JSON.parse(itemVal);
          const actsList = Array.isArray(parsedActs) ? parsedActs : [parsedActs];
          actsList.forEach((act: any) => {
            const rubricasArr = act?.rubricas || act?.rubricasOrcamentais || [];
            if (Array.isArray(rubricasArr)) {
              rubricasArr.forEach((r: any) => {
                if (r && r.nomeProduto && r.nomeProduto.trim()) {
                  const singularName = toSingularProductName(r.nomeProduto);
                  const pKey = singularName.toLowerCase();
                  if (!deletedKeys.has(pKey)) {
                    const existing = map.get(pKey);
                    map.set(pKey, {
                      nome: singularName,
                      preco: Number(r.precoUnitario || r.preco || existing?.preco) || 0,
                      unidade: r.detalhes || r.unidade || existing?.unidade || "Unidade",
                      especificacao: r.especificacao || existing?.especificacao || "",
                      rubrica: r.rubrica || existing?.rubrica || getRubricaForNecessidade(r.necessidade),
                      necessidade: r.necessidade || existing?.necessidade || "Geral",
                    });
                  }
                }
              });
            }
          });
        }
      }
    }
  } catch (e) {
    console.error("Error harvesting products from system activities:", e);
  }

  try {
    const saved = localStorage.getItem("sigep_unified_products");
    if (saved) {
      const parsed: UnifiedProduct[] = JSON.parse(saved);
      parsed.forEach((p) => {
        if (p && p.nome) {
          const singularName = toSingularProductName(p.nome);
          const key = singularName.trim().toLowerCase();
          if (!deletedKeys.has(key)) {
            const existing = map.get(key);
            map.set(key, {
              nome: singularName,
              preco: Number(p.preco) || 0,
              unidade: p.unidade || existing?.unidade || "Unidade",
              especificacao: p.especificacao || existing?.especificacao || "",
              rubrica: p.rubrica || existing?.rubrica || "Bens - 121",
              necessidade: p.necessidade || existing?.necessidade || "Geral",
              updatedAt: p.updatedAt,
            });
          }
        }
      });
    }
  } catch (e) {
    console.error("Error loading unified products:", e);
  }
  const result = Array.from(map.values());
  result.sort((a, b) => a.nome.localeCompare(b.nome, "pt-MZ", { sensitivity: "base" }));
  return result;
}

export async function saveUnifiedProduct(product: { nome: string; preco: number; unidade: string; especificacao: string; rubrica?: string; necessity?: string; necessidade?: string }) {
  try {
    const current = await getUnifiedProducts();
    const singularName = toSingularProductName(product.nome);
    const key = singularName.trim().toLowerCase();

    // If previously deleted, remove from deleted list
    const deletedKeys = getDeletedProductKeys();
    if (deletedKeys.has(key)) {
      deletedKeys.delete(key);
      localStorage.setItem("sigep_deleted_products", JSON.stringify(Array.from(deletedKeys)));
    }

    const index = current.findIndex((p) => toSingularProductName(p.nome).trim().toLowerCase() === key);
    const existing = index >= 0 ? current[index] : null;

    const updatedProduct: UnifiedProduct = {
      nome: singularName,
      preco: Number(product.preco) || 0,
      unidade: product.unidade || existing?.unidade || "Unidade",
      especificacao: product.especificacao || existing?.especificacao || "",
      rubrica: product.rubrica || existing?.rubrica || "Bens - 121",
      necessidade: product.necessidade || product.necessity || existing?.necessidade || "Geral",
      updatedAt: new Date().toISOString(),
    };

    let newList = [...current];
    if (index >= 0) {
      newList[index] = updatedProduct;
    } else {
      newList.push(updatedProduct);
    }

    localStorage.setItem("sigep_unified_products", JSON.stringify(newList));

    const docId = `prod_${key}`.replace(/[^a-zA-Z0-9_]/g, "_");
    firestoreService.produtosUnificados.set(docId, updatedProduct).catch((err) => {
      console.warn("Aviso ao salvar produto unificado no Firestore:", err);
    });

    return getUnifiedProducts();
  } catch (e) {
    console.error("Error saving unified product:", e);
    return getUnifiedProducts();
  }
}

export function collectProductFromRubric(rubrica: { nomeProduto?: string; precoUnitario?: number; detalhes?: string; especificacao?: string; rubrica?: string; necessidade?: string }) {
  if (!rubrica || !rubrica.nomeProduto || rubrica.nomeProduto.trim() === "") return;
  saveUnifiedProduct({
    nome: rubrica.nomeProduto.trim(),
    preco: Number(rubrica.precoUnitario) || 0,
    unidade: rubrica.detalhes || "Unidade",
    especificacao: rubrica.especificacao || "",
    rubrica: rubrica.rubrica,
    necessidade: rubrica.necessidade,
  });
}

let cachedFirestoreActivities: any[] = [];

// Subscrever as actividades do Firestore em tempo real para manter a cache atualizada
try {
  firestoreService.actividades.subscribe(
    (data) => {
      if (Array.isArray(data)) {
        cachedFirestoreActivities = data;
      }
    },
    (err) => {
      console.warn("Aviso ao subscrever actividades no unifiedManager:", err);
    }
  );
} catch (e) {
  console.warn("Falha ao iniciar subscrição no unifiedManager:", e);
}

export function getDepartmentStoredActivities(departmentName: string): any[] {
  if (!departmentName) return [];
  const deptKey = departmentName.trim().toLowerCase();

  // 1. Procurar primeiro nas actividades sincronizadas do Firestore (Nuvem)
  const cloudMatched = cachedFirestoreActivities.filter((act) => {
    const actDept = act.departamento || act.unidadeOrganica || act.organicUnit || "";
    return actDept.trim().toLowerCase() === deptKey;
  });

  if (cloudMatched.length > 0) {
    // Ordenar por data mais recente de atualização ou início
    return cloudMatched.sort((a, b) => {
      const dateA = a.updatedAt || a.dataInicio || "";
      const dateB = b.updatedAt || b.dataInicio || "";
      return dateB.localeCompare(dateA);
    });
  }

  // 2. Fallback para localStorage apenas se a nuvem estiver vazia
  try {
    const saved = localStorage.getItem(`sigep_dept_activities_${deptKey}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading dept activities:", e);
  }
  return [];
}

export function saveDepartmentActivity(departmentName: string, activityData: any) {
  if (!departmentName) return;
  try {
    const deptKey = departmentName.trim().toLowerCase();
    const current = getDepartmentStoredActivities(departmentName);
    const filtered = current.filter((a: any) => a.id !== activityData.id && a.nomeAtividade !== activityData.nomeAtividade);
    filtered.unshift(activityData);
    localStorage.setItem(`sigep_dept_activities_${deptKey}`, JSON.stringify(filtered));

    // Guardar diretamente na base de dados cloud (Firestore)
    if (activityData) {
      const payload = {
        ...activityData,
        departamento: departmentName,
        organicUnit: departmentName,
        updatedAt: new Date().toISOString(),
      };
      if (activityData.id && !String(activityData.id).startsWith("local_")) {
        firestoreService.updateInCollection("actividades", activityData.id, payload).catch((err) => {
          console.warn("Aviso ao atualizar atividade no Firestore:", err);
        });
      } else {
        firestoreService.addToCollection("actividades", payload).catch((err) => {
          console.warn("Aviso ao adicionar atividade no Firestore:", err);
        });
      }
    }
  } catch (e) {
    console.error("Error saving dept activity:", e);
  }
}
