import { useState } from "react";
import { Camera, Calendar, User, ShoppingBag, CheckCircle, ArrowRight, ArrowLeft, Loader, Package } from "lucide-react";

interface BookingPageProps {
  hookData: any; // Receives the hook results for clean decoupling
}

export function BookingPage({ hookData }: BookingPageProps) {
  const {
    photographers,
    equipmentList,
    selectedPhotographer,
    setSelectedPhotographer,
    selectedEquipment,
    setSelectedEquipment,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    calculatedPrice,
    calculatedDays,
    bookingLoading,
    successMsg,
    errorMsg,
    submitBooking,
  } = hookData;

  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState("custom");

  const packages = [
    {
      id: "portrait",
      name: "Wedding & Portrait Studio",
      desc: "Hire a premium portrait photographer. Equipment optional.",
      icon: User,
    },
    {
      id: "commercial",
      name: "Cinematic Commercial",
      desc: "Hire studio crew and premium lighting gear.",
      icon: Camera,
    },
    {
      id: "custom",
      name: "Custom Project Planner",
      desc: "Build your own package of gear and photographers.",
      icon: Package,
    },
  ];

  const handleNextStep = () => {
    if (step < 3) setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const getEquipmentName = () => {
    const item = equipmentList.find((e: any) => e.id === selectedEquipment);
    return item ? item.name : "None selected";
  };

  const getPhotographerName = () => {
    const item = photographers.find((p: any) => p.id === selectedPhotographer);
    return item ? item.full_name : "None selected";
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {/* Tab Header & Steps Indicator */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-50 font-serif">Place a Booking</h3>
          <p className="text-xs text-zinc-500">Decoupled UI Flow Planner</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
          <span className={step >= 1 ? "text-slate-50 font-bold" : ""}>1</span>
          <span>&rarr;</span>
          <span className={step >= 2 ? "text-slate-50 font-bold" : ""}>2</span>
          <span>&rarr;</span>
          <span className={step >= 3 ? "text-slate-50 font-bold" : ""}>3</span>
        </div>
      </div>

      <form onSubmit={submitBooking} className="space-y-6">
        {/* STEP 1: Package Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-400">Step 1: Select Booking Template</h4>
            <div className="grid grid-cols-1 gap-4">
              {packages.map((pkg) => {
                const Icon = pkg.icon;
                const isSelected = selectedPackage === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackage(pkg.id);
                      if (pkg.id === "custom") {
                        setSelectedPhotographer("");
                        setSelectedEquipment("");
                      } else if (pkg.id === "portrait") {
                        // Pre-select first photographer if available
                        if (photographers.length > 0) setSelectedPhotographer(photographers[0].id);
                        setSelectedEquipment("");
                      } else if (pkg.id === "commercial") {
                        // Pre-select first gear if available
                        if (equipmentList.length > 0) setSelectedEquipment(equipmentList[0].id);
                        if (photographers.length > 0) setSelectedPhotographer(photographers[0].id);
                      }
                    }}
                    className={`border p-4 rounded-lg flex items-start gap-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-850 border-slate-50 text-slate-50 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className={`p-2.5 rounded-md border ${
                      isSelected ? "bg-slate-50 text-zinc-950 border-slate-50" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-zinc-200">{pkg.name}</div>
                      <div className="text-xs text-zinc-500 leading-relaxed">{pkg.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-slate-50 hover:bg-slate-200 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Resource Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-400">Step 2: Assign Photographers & Gear</h4>
            
            {/* Choose Photographer */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Select Photographer (Optional)</span>
              </label>
              <select
                value={selectedPhotographer}
                onChange={(e) => setSelectedPhotographer(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-sm focus:border-slate-50 focus:outline-none"
              >
                <option value="">None (Rent equipment only)</option>
                {photographers.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Choose Equipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
                <span>Select Camera/Lens/Lighting (Optional)</span>
              </label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-sm focus:border-slate-50 focus:outline-none"
              >
                <option value="">None (Hire photographer only)</option>
                {equipmentList.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} (${Number(e.price_per_day).toFixed(0)}/day)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="border border-zinc-850 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-slate-50 hover:bg-slate-200 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Dates & Price Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-400">Step 3: Select Schedule Dates</h4>
            
            {/* Date Picker Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-xs focus:border-slate-50 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-xs focus:border-slate-50 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Total Price Summary Box */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3 font-mono text-xs text-zinc-400">
              <div className="text-zinc-500 font-semibold mb-1 uppercase tracking-wider font-serif">Booking Summary</div>
              <div className="flex justify-between">
                <span>Selected Package:</span>
                <span className="text-zinc-300 capitalize">{selectedPackage}</span>
              </div>
              <div className="flex justify-between">
                <span>Photographer:</span>
                <span className="text-zinc-300">{getPhotographerName()}</span>
              </div>
              <div className="flex justify-between">
                <span>Rented Gear:</span>
                <span className="text-zinc-300">{getEquipmentName()}</span>
              </div>
              <div className="flex justify-between">
                <span>Rental Period:</span>
                <span className="text-zinc-300">{calculatedDays} Day(s)</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-3 text-sm font-semibold">
                <span className="text-zinc-500 font-serif">Total Calculated Cost:</span>
                <span className="text-slate-50">${calculatedPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Navigations & Form Submit */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="border border-zinc-850 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              <button
                type="submit"
                disabled={bookingLoading}
                className="bg-slate-50 hover:bg-slate-200 text-zinc-950 text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {bookingLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Confirm & Book Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Message Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
          <span className="font-semibold">Error:</span> {errorMsg}
        </div>
      )}
    </div>
  );
}
