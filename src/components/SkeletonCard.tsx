export default function SkeletonCard() {

  return (

    <div className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">

      {/* TITLE */}
      <div className="h-5 bg-gray-200 rounded-xl w-1/2" />

      {/* SUBTITLE */}
      <div className="h-4 bg-gray-100 rounded-xl w-1/3 mt-3" />

      {/* TAGS */}
      <div className="flex gap-2 mt-4">

        <div className="h-7 w-20 rounded-full bg-gray-100" />

        <div className="h-7 w-24 rounded-full bg-gray-100" />

      </div>

      {/* BUTTONS */}
      <div className="flex gap-2 mt-5">

        <div className="h-10 w-10 rounded-2xl bg-gray-100" />

        <div className="h-10 w-32 rounded-2xl bg-gray-200" />

      </div>

    </div>
  );
}