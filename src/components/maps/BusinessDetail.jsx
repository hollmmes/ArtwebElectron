import { X, MapPin, Phone, Globe, Star, Clock } from 'lucide-react'

export default function BusinessDetail({ business, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">{business.name}</h2>
            {business.category && (
              <span className="text-xs px-2 py-1 mt-2 inline-block rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                {business.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {business.rating && (
            <div className="flex items-center gap-3">
              <Star size={18} className="text-yellow-400" fill="currentColor" />
              <span className="text-white">
                {business.rating} / 5
                {business.reviews_count && (
                  <span className="text-white/50 ml-2">({business.reviews_count} yorum)</span>
                )}
              </span>
            </div>
          )}

          {business.address && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-white/40 mt-0.5" />
              <span className="text-white/80">{business.address}</span>
            </div>
          )}

          {business.phone && (
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-white/40" />
              <span className="text-white/80">{business.phone}</span>
            </div>
          )}

          {business.website && (
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-primary-400" />
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:underline text-sm truncate"
              >
                {business.website}
              </a>
            </div>
          )}

          {business.hours && business.hours.length > 0 && (
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-white/40 mt-0.5" />
              <div className="space-y-1">
                {business.hours.map((h, i) => (
                  <p key={i} className="text-white/70 text-sm">{h}</p>
                ))}
              </div>
            </div>
          )}

          {business.description && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-white/60 text-sm">{business.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
