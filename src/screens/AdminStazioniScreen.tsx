interface Props {
  adminPin: string;
}

export default function AdminStazioniScreen({ adminPin }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Gestione Stazioni
      </h1>

      <p className="text-sm text-gray-500 mt-2">
        Schermata in costruzione
      </p>
    </div>
  );
}