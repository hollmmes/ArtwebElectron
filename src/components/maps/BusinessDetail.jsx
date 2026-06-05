import { X, MapPin, Phone, Globe, Star, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react'
import { useState } from 'react'

const SOCIAL_LABELS = {
  facebook: { label: 'Facebook', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  instagram: { label: 'Instagram', color: 'text-pink-400 bg-pink-400/10 border-pink-400/30' },
  twitter: { label: 'Twitter/X', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' },
  youtube: { label: 'YouTube', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  linkedin: { label: 'LinkedIn', color: 'text-blue-300 bg-blue-300/10 border-blue-300/30' },
  tiktok: { label: 'TikTok', color: 'text-white bg-white/10 border-white/30' },
}

export default function BusinessDetail({ business, onClose }) {
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  const hasSocial = business.social_media && Object.keys(business.social_media).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
        {/* Başlık */}
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

        {/* İçerik */}
        <div className="p-6 space-y-4">
          {/* Puan */}
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

          {/* Adres */}
          {business.address && (
            <div className="flex items-center gap-3 group">
              <MapPin size={18} className="text-white/40 shrink-0" />
              <span className="text-white/80 flex-1">{business.address}</span>
              <button
                onClick={() => copyToClipboard(business.address, 'address')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                title="Kopyala"
              >
                {copied === 'address' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
              </button>
            </div>
          )}

          {/* Telefon */}
          {business.phone && (
            <div className="flex items-center gap-3 group">
              <Phone size={18} className="text-white/40 shrink-0" />
              <span className="text-white/80 flex-1">{business.phone}</span>
              <button
                onClick={() => copyToClipboard(business.phone, 'phone')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                title="Kopyala"
              >
                {copied === 'phone' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
              </button>
            </div>
          )}

          {/* Website */}
          {business.website && (
            <div className="flex items-center gap-3 group">
              <Globe size={18} className="text-primary-400 shrink-0" />
              <span className="text-primary-400 flex-1 truncate">{business.website}</span>
              <button
                onClick={() => copyToClipboard(business.website, 'website')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                title="Kopyala"
              >
                {copied === 'website' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
              </button>
            </div>
          )}

          {/* Sosyal Medya */}
          {hasSocial && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-xs font-medium mb-3">Sosyal Medya</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(business.social_media).map(([platform, url]) => {
                  const info = SOCIAL_LABELS[platform] || { label: platform, color: 'text-white/60 bg-white/5 border-white/20' }
                  return (
                    <button
                      key={platform}
                      onClick={() => copyToClipboard(url, platform)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${info.color}`}
                      title={url}
                    >
                      {copied === platform ? (
                        <Check size={12} className="text-green-400" />
                      ) : (
                        <ExternalLink size={12} />
                      )}
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hakkında */}
          {business.about && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-xs font-medium mb-2">Hakkında</p>
              <p className="text-white/70 text-sm">{business.about}</p>
            </div>
          )}

          {/* Yorumlar */}
          {business.reviews && business.reviews.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-xs font-medium mb-3">
                <MessageSquare size={12} className="inline mr-1" />
                Son Yorumlar
              </p>
              <div className="space-y-3">
                {business.reviews.map((review, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60 text-xs font-medium">{review.author}</span>
                      {review.rating && (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star size={10} fill="currentColor" />
                          {review.rating}
                        </span>
                      )}
                    </div>
                    {review.text && (
                      <p className="text-white/70 text-sm leading-relaxed">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
