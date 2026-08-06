import React from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Supplier } from "../../types";
import { usePersistentDraft } from "../../hooks/usePersistentDraft";
import { DraftModal, SyncIndicator } from "../../components/ui/DraftMemoryUI";

interface SupplierRegistrationFormProps {
  onBack: () => void;
  onSubmit: (supplier: Supplier) => void;
}

const initialSupplierState = {
  nome: "",
  tipoServico: "",
  validadeContrato: "",
  contacto: "",
  email: "",
};

export default function UGEA_SupplierRegistrationForm({
  onBack,
  onSubmit,
}: SupplierRegistrationFormProps) {
  const {
    data: formData,
    setData: setFormData,
    isDraftLoaded,
    showDraftModal,
    isSyncing,
    recoverDraft,
    discardDraft,
    clearDraft,
  } = usePersistentDraft("supplier_registration_form", initialSupplierState);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      dataRegisto: new Date().toISOString().split("T")[0],
    });
    clearDraft();
  };

  if (!isDraftLoaded && !showDraftModal) return null;

  return (
    <div className="h-screen w-full bg-white flex flex-col p-6 relative">
      <DraftModal
        show={showDraftModal}
        onRecover={recoverDraft}
        onDiscard={discardDraft}
      />

      <SyncIndicator
        isSyncing={isSyncing}
        className="absolute top-6 right-20 z-50"
      />

      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-blue-900">Novo Fornecedor</h1>
      </header>
      <form
        onSubmit={handleSubmit}
        className="max-w-xl mx-auto w-full bg-gray-50 p-8 rounded-2xl border border-gray-200"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Nome do Fornecedor
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange("nome", e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Tipo de Serviço
            </label>
            <input
              type="text"
              value={formData.tipoServico}
              onChange={(e) => handleInputChange("tipoServico", e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Validade do Contrato
            </label>
            <input
              type="date"
              value={formData.validadeContrato}
              onChange={(e) =>
                handleInputChange("validadeContrato", e.target.value)
              }
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Contacto
            </label>
            <input
              type="text"
              value={formData.contacto}
              onChange={(e) => handleInputChange("contacto", e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full mt-6 bg-blue-600 text-white font-bold p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"
        >
          <Save size={20} /> Guardar
        </button>
      </form>
    </div>
  );
}
