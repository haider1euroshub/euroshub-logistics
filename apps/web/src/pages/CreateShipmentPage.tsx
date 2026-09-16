import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../components/ui/Toast.js';
import {
  PackagePlus,
  Truck,
  DollarSign,
  CheckCircle2,
  Copy,
  Check,
  FileDown,
  ArrowRight,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ServiceType,
  PaymentType,
  formatPKR,
} from '@eliteship/shared';

const DEFAULT_CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan', 'Rawalpindi', 'Peshawar', 'Quetta'];

export const CreateShipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [estimate, setEstimate] = useState<any>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copiedModalNumber, setCopiedModalNumber] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    senderCity: 'Karachi',
    senderAddressExtra: '',

    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    receiverCity: 'Lahore',
    receiverAddressExtra: '',

    serviceType: ServiceType.STANDARD,
    paymentType: PaymentType.PREPAID,
    codAmount: 0,

    packageType: 'Parcel',
    weightKg: 1,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    description: '',
    declaredValue: 1500,
    isFragile: false,
  });

  // Fetch active network cities from public endpoint
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await apiClient<{ cities: string[] }>('/api/hubs/public');
        if (res.cities && res.cities.length > 0) {
          setCities(res.cities);
          setFormData((prev) => ({
            ...prev,
            senderCity: prev.senderCity || res.cities[0],
            receiverCity: prev.receiverCity || res.cities[1] || res.cities[0],
          }));
        }
      } catch {
        // Fallback to default cities list
      }
    };
    fetchCities();
  }, []);

  // Auto-populate sender info from authenticated profile if not already set
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        senderName: prev.senderName || user.fullName || '',
        senderPhone: prev.senderPhone || user.phone || '',
      }));
    }
  }, [user]);

  // Update real-time price estimate
  useEffect(() => {
    let active = true;
    const fetchEstimate = async () => {
      if (!formData.senderCity || !formData.receiverCity || formData.weightKg <= 0) {
        setEstimate(null);
        setEstimateError(null);
        return;
      }
      setEstimateLoading(true);
      try {
        const res = await apiClient<{ estimation: any }>('/api/pricing/estimate', {
          method: 'POST',
          body: JSON.stringify({
            serviceType: formData.serviceType,
            originZone: formData.senderCity,
            destinationZone: formData.receiverCity,
            weightKg: Number(formData.weightKg),
            paymentType: formData.paymentType,
            declaredOrCodAmount:
              formData.paymentType === PaymentType.COD
                ? Number(formData.codAmount)
                : Number(formData.declaredValue || 0),
          }),
        });
        if (active) {
          setEstimate(res.estimation);
          setEstimateError(null);
        }
      } catch (err: any) {
        if (active) {
          setEstimate(null);
          setEstimateError(err.message || 'No pricing rule configured for this route.');
        }
      } finally {
        if (active) setEstimateLoading(false);
      }
    };

    const timer = setTimeout(fetchEstimate, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    formData.senderCity,
    formData.receiverCity,
    formData.weightKg,
    formData.serviceType,
    formData.paymentType,
    formData.codAmount,
    formData.declaredValue,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        ...formData,
        senderName: formData.senderName.trim(),
        senderPhone: formData.senderPhone.trim(),
        senderAddress: formData.senderAddress.trim(),
        senderCity: formData.senderCity.trim(),
        senderAddressExtra: formData.senderAddressExtra?.trim() || undefined,
        receiverName: formData.receiverName.trim(),
        receiverPhone: formData.receiverPhone.trim(),
        receiverAddress: formData.receiverAddress.trim(),
        receiverCity: formData.receiverCity.trim(),
        receiverAddressExtra: formData.receiverAddressExtra?.trim() || undefined,
        packageType: formData.packageType.trim(),
        description: formData.description?.trim() || undefined,
        weightKg: Number(formData.weightKg),
        lengthCm: formData.lengthCm ? Number(formData.lengthCm) : null,
        widthCm: formData.widthCm ? Number(formData.widthCm) : null,
        heightCm: formData.heightCm ? Number(formData.heightCm) : null,
        declaredValue: formData.declaredValue ? Math.round(Number(formData.declaredValue)) : null,
        codAmount: formData.paymentType === PaymentType.COD ? Math.round(Number(formData.codAmount)) : null,
      };

      const res = await apiClient<any>('/api/shipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedResult(res);
      success(`Shipment booked successfully! Tracking: ${res.trackingNumber}`);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to create shipment.';
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        errorMessage = err.details.map((d: any) => d.message || d).join('. ');
      }
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (shipmentId: string, trackingNo: string) => {
    try {
      const blob = await apiClient<Blob>(`/api/shipments/${shipmentId}/receipt`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Consignment-Note-${trackingNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toastError(err.message || 'Failed to download receipt');
    }
  };

  const copyModalTracking = () => {
    if (!createdResult?.trackingNumber) return;
    navigator.clipboard.writeText(createdResult.trackingNumber);
    setCopiedModalNumber(true);
    success(`Copied ${createdResult.trackingNumber} to clipboard`);
    setTimeout(() => setCopiedModalNumber(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <PackagePlus className="w-8 h-8 text-brand-600" />
          Book Shipment
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete sender, recipient, and package details. Pricing is calculated accurately in real time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Numbered Logical Sections (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Sender Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                1
              </span>
              Sender Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sender Full Name"
                required
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="e.g. Asad Malik"
              />
              <Input
                label="Sender Phone Number"
                required
                value={formData.senderPhone}
                onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                placeholder="03001234567"
              />
              <Select
                label="Origin City (Hub Network)"
                required
                value={formData.senderCity}
                onChange={(e) => setFormData({ ...formData, senderCity: e.target.value })}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Input
                label="Pickup Address Details"
                required
                value={formData.senderAddress}
                onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                placeholder="Shop 12, Main Commercial Area"
              />
            </div>
          </div>

          {/* Section 2: Recipient Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                2
              </span>
              Recipient Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Recipient Full Name"
                required
                value={formData.receiverName}
                onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                placeholder="e.g. Fatima Tariq"
              />
              <Input
                label="Recipient Phone Number"
                required
                value={formData.receiverPhone}
                onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                placeholder="03219876543"
              />
              <Select
                label="Destination City (Hub Network)"
                required
                value={formData.receiverCity}
                onChange={(e) => setFormData({ ...formData, receiverCity: e.target.value })}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Input
                label="Destination Delivery Address"
                required
                value={formData.receiverAddress}
                onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                placeholder="House 45, Street 8, Block B"
              />
            </div>
          </div>

          {/* Section 3: Package Specifications */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                3
              </span>
              Package Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Package Type"
                required
                value={formData.packageType}
                onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                placeholder="Box, Carton, Flyer"
              />
              <Input
                label="Weight (kg)"
                type="number"
                min="0.1"
                step="0.1"
                required
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
              />
              <Input
                label="Declared Value (PKR)"
                type="number"
                min="0"
                value={formData.declaredValue}
                onChange={(e) => setFormData({ ...formData, declaredValue: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Length (cm)"
                type="number"
                value={formData.lengthCm}
                onChange={(e) => setFormData({ ...formData, lengthCm: Number(e.target.value) })}
              />
              <Input
                label="Width (cm)"
                type="number"
                value={formData.widthCm}
                onChange={(e) => setFormData({ ...formData, widthCm: Number(e.target.value) })}
              />
              <Input
                label="Height (cm)"
                type="number"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="fragile-check"
                checked={formData.isFragile}
                onChange={(e) => setFormData({ ...formData, isFragile: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <label htmlFor="fragile-check" className="text-sm font-medium text-slate-700 select-none">
                Fragile shipment (Apply handle-with-care protocol)
              </label>
            </div>
          </div>

          {/* Section 4: Service Level & Payment Terms */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                4
              </span>
              Service Level & Payment Terms
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Delivery Speed
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceType: ServiceType.STANDARD })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      formData.serviceType === ServiceType.STANDARD
                        ? 'bg-brand-50 text-brand-700 border-brand-500 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    STANDARD (2-3 Days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceType: ServiceType.EXPRESS })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      formData.serviceType === ServiceType.EXPRESS
                        ? 'bg-brand-50 text-brand-700 border-brand-500 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    EXPRESS (Priority)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: PaymentType.PREPAID })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      formData.paymentType === PaymentType.PREPAID
                        ? 'bg-brand-50 text-brand-700 border-brand-500 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    PREPAID (Sender)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: PaymentType.COD })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      formData.paymentType === PaymentType.COD
                        ? 'bg-amber-50 text-amber-800 border-amber-500 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    COD (Cash on Delivery)
                  </button>
                </div>
              </div>
            </div>

            {formData.paymentType === PaymentType.COD && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <DollarSign className="w-4 h-4" /> Cash On Delivery Product Collection Amount
                </div>
                <Input
                  label="Product Cash to Collect from Recipient (PKR)"
                  type="number"
                  min="1"
                  required
                  value={formData.codAmount}
                  onChange={(e) => setFormData({ ...formData, codAmount: Number(e.target.value) })}
                  placeholder="e.g. 3500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Dynamic Pricing Summary & Submission (4 Cols) */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
              Booking Fare Summary
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                PKR
              </span>
            </h2>

            {estimateLoading ? (
              <div className="text-center py-6 text-xs text-slate-500 space-y-2">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Calculating authoritative freight quote...</p>
              </div>
            ) : estimate ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Base Freight Fee:</span>
                  <span className="font-semibold text-slate-900">{formatPKR(estimate.baseFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Weight Surcharge:</span>
                  <span className="font-semibold text-slate-900">{formatPKR(estimate.weightSurcharge)}</span>
                </div>
                {formData.paymentType === PaymentType.COD && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>COD Handling Fee:</span>
                    <span className="font-semibold text-slate-900">{formatPKR(estimate.codFee)}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-base text-slate-900">
                  <span>Total Shipping Fee:</span>
                  <span className="text-brand-600 font-extrabold">{formatPKR(estimate.totalFee)}</span>
                </div>

                {formData.paymentType === PaymentType.COD && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      Total Cash To Collect at Doorstep:
                    </span>
                    <span className="text-lg font-black text-amber-900">
                      {formatPKR(estimate.codAmountToCollect)}
                    </span>
                    <p className="text-[10px] text-amber-700">
                      Product amount + freight charges.
                    </p>
                  </div>
                )}
              </div>
            ) : estimateError ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Fare Calculation Notice</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">{estimateError}</p>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Enter shipment weight to calculate fare.
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold h-12 shadow-xs"
              isLoading={loading}
              disabled={!estimate || loading || estimateLoading}
            >
              Confirm Booking & Generate Tracking
            </Button>
          </div>
        </div>
      </form>

      {/* Upgraded Post-Booking Confirmation Modal */}
      {createdResult && (
        <Modal
          isOpen={true}
          onClose={() => navigate('/customer/dashboard')}
          title="Shipment Successfully Booked!"
          maxWidth="lg"
        >
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            {/* Prominent Tracking Number Box */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500">
                Assigned Tracking Number
              </p>
              <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 font-mono text-2xl font-black text-brand-700 tracking-wider shadow-2xs">
                <span>{createdResult.trackingNumber}</span>
                <button
                  type="button"
                  onClick={copyModalTracking}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Copy tracking number"
                >
                  {copiedModalNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                This shipment has been permanently archived in your account under{' '}
                <strong className="text-slate-700">My Shipments</strong>.
              </p>
            </div>

            {/* Shipment Summary Grid */}
            <div className="p-4 rounded-xl bg-white text-xs text-left grid grid-cols-2 gap-3 border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">From (Origin):</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {createdResult.shipment?.senderName} ({createdResult.shipment?.senderCity})
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">To (Destination):</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {createdResult.shipment?.receiverName} ({createdResult.shipment?.receiverCity})
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Service & Payment:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {createdResult.shipment?.serviceType} — {createdResult.shipment?.paymentType}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Freight:</span>
                <p className="font-bold text-brand-700 mt-0.5">
                  {formatPKR(createdResult.pricing?.totalFee || 0)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleDownloadReceipt(
                    createdResult.shipment.id,
                    createdResult.trackingNumber
                  )
                }
              >
                <FileDown className="w-4 h-4 mr-1.5" /> Consignment Note (PDF)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/customer/dashboard')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5" /> My Shipments
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/track?number=${encodeURIComponent(createdResult.trackingNumber)}`)}
                >
                  <Compass className="w-4 h-4 mr-1.5" /> Live Track
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
