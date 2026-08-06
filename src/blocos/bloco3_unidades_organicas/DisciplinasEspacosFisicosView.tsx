import React, { useState, useEffect } from "react";
import { Book, Building, FlaskConical, Wrench, Plus, Trash2, Edit3, CheckCircle, XCircle } from "lucide-react";
import { firestoreService } from "../../lib/firestoreService";
import RegistarMateriaisBensForm from "../bloco8_gerais/RegistarMateriaisBensForm";

export default function DisciplinasEspacosFisicosView({
  user,
  onShowAlert,
  categoria,
}: {
  user: any;
  onShowAlert: (msg: string) => void;
  categoria: string;
}) {
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [disciplinasList, setDisciplinasList] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    departamento: "Departamento de Engenharia Eletrotécnica",
    curso: "Engenharia Elétrica",
    docenteId: "",
    classificacaoExame: "com_exame", // "com_exame" ou "sem_exame"
    semestre: "1º Semestre",
  });

  const departamentoCursosMap: Record<string, string[]> = {
    "Departamento de Engenharia Eletrotécnica": [
      "Engenharia Elétrica",
      "Engenharia Eletrónica e de Telecomunicações",
      "Engenharia de Energias Renováveis",
    ],
    "Departamento de Engenharia de Construção Civil": [
      "Engenharia de Construção Civil",
      "Engenharia Hidráulica",
    ],
    "Departamento de Engenharia de Construção Mecânica": [
      "Engenharia de Construção Mecânica",
      "Engenharia Termotécnica",
    ],
    "Departamento de Disciplinas Gerais": [
      "Engenharia Informática",
      "Ciências Biológicas",
      "Economia",
      "Matemática",
      "Física",
      "Química",
    ],
  };

  const userDept = user?.departamento || user?.title || "";
  const matchingDept = Object.keys(departamentoCursosMap).find(d => userDept.includes(d) || d.includes(userDept));
  const defaultDept = matchingDept || "Departamento de Engenharia Eletrotécnica";
  const defaultCurso = departamentoCursosMap[defaultDept]?.[0] || "Engenharia Elétrica";

  const displayedDisciplinas = matchingDept
    ? disciplinasList.filter(d => d.departamento === matchingDept)
    : disciplinasList;

  useEffect(() => {
    const unsubDisc = firestoreService.disciplinas_academicas.subscribe((data: any[]) => {
      setDisciplinasList(data || []);
    });
    const unsubColab = firestoreService.colaboradores.subscribe((data: any[]) => {
      setDocentes((data || []).filter((d: any) => d.tipo === "Docente"));
    });
    return () => {
      unsubDisc();
      unsubColab();
    };
  }, []);

  const handleSaveDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.codigo) {
      onShowAlert("Preencha o nome e o código da disciplina.");
      return;
    }

    try {
      if (editingId) {
        await firestoreService.disciplinas_academicas.update(editingId, formData);
        onShowAlert("Disciplina atualizada com sucesso!");
        setEditingId(null);
      } else {
        await firestoreService.disciplinas_academicas.add({
          ...formData,
          createdAt: new Date().toISOString(),
        });
        onShowAlert("Disciplina registada com sucesso!");
      }
      setFormData({
        nome: "",
        codigo: "",
        departamento: "Departamento de Disciplinas Gerais",
        curso: "Engenharia Informática",
        docenteId: "",
        classificacaoExame: "com_exame",
        semestre: "1º Semestre",
      });
      setShowForm(false);
    } catch (err) {
      console.error(err);
      onShowAlert("Erro ao salvar disciplina.");
    }
  };

  const handleEdit = (disc: any) => {
    setFormData({
      nome: disc.nome || "",
      codigo: disc.codigo || "",
      departamento: disc.departamento || "Departamento de Disciplinas Gerais",
      curso: disc.curso || "Engenharia Informática",
      docenteId: disc.docenteId || "",
      classificacaoExame: disc.classificacaoExame || "com_exame",
      semestre: disc.semestre || "1º Semestre",
    });
    setEditingId(disc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja eliminar esta disciplina?")) {
      try {
        await firestoreService.disciplinas_academicas.delete(id);
        onShowAlert("Disciplina eliminada com sucesso!");
      } catch (err) {
        onShowAlert("Erro ao eliminar disciplina.");
      }
    }
  };

  if (categoria !== "Disciplinas") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-900">Gestão de {categoria}</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[300px]">
          <div className="flex items-center gap-2 mb-4 text-blue-900 font-bold">
            <Building size={20} />
            <h3>Espaço Físico / Instalação</h3>
          </div>
          <p className="text-slate-600">Gestão de salas, laboratórios, oficinas e espaços físicos institucionais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Gestão de Disciplinas & Classificação de Exames</h2>
          <p className="text-sm text-slate-600 mt-1">Registe e classifique as cadeiras (Com Exame / Sem Exame) e docente atribuído.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              nome: "",
              codigo: "",
              departamento: defaultDept,
              curso: defaultCurso,
              docenteId: "",
              classificacaoExame: "com_exame",
              semestre: "1º Semestre",
            });
            setShowForm(!showForm);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} /> {showForm ? "Fechar Formulário" : "Registar Nova Disciplina"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveDisciplina} className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold text-blue-900 border-b pb-2">
            {editingId ? "Editar Disciplina" : "Registar Nova Disciplina Académica"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Disciplina *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => {
                  const val = e.target.value;
                  const words = val.trim().toUpperCase().split(/\s+/);
                  let autoCode = "";
                  if (words.length > 0 && words[0]) {
                    autoCode = words.map(w => w[0]).join("");
                    if (words.length > 1) {
                      autoCode += "-" + words[1].substring(0, 3);
                    }
                  }
                  setFormData({ ...formData, nome: val, codigo: autoCode || formData.codigo });
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Cálculo I"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Código da Disciplina (Gerado Automaticamente) *</label>
              <input
                type="text"
                required
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: CALC-I"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Departamento</label>
              <select
                value={formData.departamento}
                disabled={!!matchingDept}
                onChange={(e) => {
                  const newDept = e.target.value;
                  const firstCurso = departamentoCursosMap[newDept]?.[0] || "";
                  setFormData({ ...formData, departamento: newDept, curso: firstCurso });
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-700"
              >
                <option value="Departamento de Engenharia Eletrotécnica">Departamento de Engenharia Eletrotécnica</option>
                <option value="Departamento de Engenharia de Construção Civil">Departamento de Engenharia de Construção Civil</option>
                <option value="Departamento de Engenharia de Construção Mecânica">Departamento de Engenharia de Construção Mecânica</option>
                <option value="Departamento de Disciplinas Gerais">Departamento de Disciplinas Gerais</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Curso</label>
              <select
                value={formData.curso}
                onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {(departamentoCursosMap[formData.departamento] || []).map((cursoName) => (
                  <option key={cursoName} value={cursoName}>{cursoName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Docente Atribuído</label>
              <select
                value={formData.docenteId}
                onChange={(e) => setFormData({ ...formData, docenteId: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecione o Docente</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Classificação para Exame *</label>
              <select
                value={formData.classificacaoExame}
                onChange={(e) => setFormData({ ...formData, classificacaoExame: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 text-blue-900"
              >
                <option value="com_exame">📚 Disciplina com Exame</option>
                <option value="sem_exame">📖 Disciplina sem Exame (Apenas Avaliação Contínua)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm"
            >
              Salvar Disciplina
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <Book size={18} /> Lista de Disciplinas Registadas ({displayedDisciplinas.length})
          </h3>
        </div>
        {displayedDisciplinas.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Nenhuma disciplina registada ainda. Clique em "Registar Nova Disciplina" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b">
                  <th className="p-3">Código</th>
                  <th className="p-3">Nome da Disciplina</th>
                  <th className="p-3">Curso / Departamento</th>
                  <th className="p-3">Docente Atribuído</th>
                  <th className="p-3">Classificação Exame</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDisciplinas.map((disc) => {
                  const doc = docentes.find((d) => d.id === disc.docenteId);
                  const isComExame = disc.classificacaoExame !== "sem_exame";
                  return (
                    <tr key={disc.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-blue-900">{disc.codigo}</td>
                      <td className="p-3 font-bold text-slate-800">{disc.nome}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{disc.curso}</div>
                        <div className="text-[10px] text-slate-500">{disc.departamento}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{doc ? doc.nome : "Não atribuído"}</td>
                      <td className="p-3">
                        {isComExame ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle size={13} /> Com Exame
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <XCircle size={13} /> Sem Exame
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(disc)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(disc.id)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-bold hover:bg-red-100 transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
