import { X, MapPin, Phone, Globe, Star, Copy, Check, MessageSquare, ExternalLink, Clock, Tag, Navigation, Info, Mail, ChevronRight, ChevronLeft, Image } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

const SOCIAL_LABELS = {
  facebook: { label: 'Facebook', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  instagram: { label: 'Instagram', color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
  twitter: { label: 'Twitter/X', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  youtube: { label: 'YouTube', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  linkedin: { label: 'LinkedIn', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  tiktok: { label: 'TikTok', color: 'text-slate-300 bg-slate-300/10 border-slate-300/20' },
}

export default function BusinessDetail({ business, onClose }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [copied, setCopied] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const emails = business.emails || []
  const [showFullDetail, setShowFullDetail] = useState(false)

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  const hasSocial = business.social_media && Object.keys(business.social_media).length > 0
  const hasHours = business.working_hours && Object.keys(business.working_hours).length > 0
  const hasFeatures = business.features && business.features.length > 0
  const hasPhotos = business.photos && business.photos.length > 0
  const hasReviews = business.reviews && business.reviews.length > 0
  const hasCoords = business.latitude && business.longitude

  // Popup ozet gorunumu
  if (!showFullDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className={`rounded-xl w-full max-w-md m-4 ${
            isDark ? 'bg-slate-900 border border-slate-700/60' : 'bg-white border border-gray-200 shadow-xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick photo */}
          {hasPhotos && (
            <div className="relative h-36 overflow-hidden rounded-t-xl">
              <img src={business.photos[0]} alt={business.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h2 className="text-white font-bold text-lg">{business.name}</h2>
                {business.category && (
                  <span className="text-white/70 text-xs">{business.category}</span>
                )}
              </div>
            </div>
          )}

          {!hasPhotos && (
            <div className={`p-4 pb-2 ${isDark ? '' : ''}`}>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h2>
              {business.category && (
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.category}</span>
              )}
            </div>
          )}

          <div className="p-4 space-y-2.5">
            {business.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={14} className={n <= Math.round(business.rating) ? 'text-amber-500' : (isDark ? 'text-slate-700' : 'text-gray-200')} fill="currentColor" />
                  ))}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.rating}</span>
                {business.reviews_count && (
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({business.reviews_count})</span>
                )}
              </div>
            )}

            {business.address && (
              <div className="flex items-center gap-2.5">
                <MapPin size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{business.phone}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2.5">
                <Globe size={14} className="text-blue-500" />
                <span className="text-sm text-blue-500">{business.website}</span>
              </div>
            )}
            {emails.length > 0 && (
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-emerald-500" />
                <span className="text-sm text-emerald-500">{emails[0]}</span>
              </div>
            )}
          </div>

          <div className={`p-4 pt-2 flex gap-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            <button
              onClick={() => setShowFullDetail(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Detaylari Gor
              <ChevronRight size={16} />
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tam detay paneli (sag tarafa slide)
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Overlay */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`w-full max-w-xl h-full overflow-y-auto animate-slide-in ${
          isDark ? 'bg-slate-900 border-l border-slate-700/60' : 'bg-white border-l border-gray-200 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b backdrop-blur-md ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-100'
        }`}>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h2>
            {business.category && (
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.category}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Fotograflar */}
        {hasPhotos && (
          <div className="p-4 pb-0">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden cursor-pointer" onClick={() => { setGalleryIndex(0); setGalleryOpen(true) }}>
              {business.photos.slice(0, 6).map((url, i) => (
                <div key={i} className={`relative overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className={`w-full object-cover hover:scale-105 transition-transform duration-300 ${i === 0 ? 'h-48' : 'h-[94px]'}`}
                    loading="lazy"
                  />
                  {i === 5 && business.photos.length > 6 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">+{business.photos.length - 6}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className={`text-xs text-center mt-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              <Image size={11} className="inline mr-1" />{business.photos.length} fotograf - goruntule
            </p>
          </div>
        )}

        {/* Galeri Modal */}
        {galleryOpen && hasPhotos && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setGalleryOpen(false)}>
            <button onClick={() => setGalleryOpen(false)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white">
              <X size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => Math.max(0, prev - 1)) }}
              className={`absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 ${galleryIndex === 0 ? 'opacity-30' : ''}`}
              disabled={galleryIndex === 0}
            >
              <ChevronLeft size={24} />
            </button>
            <img
              src={business.photos[galleryIndex]}
              alt={`Foto ${galleryIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => Math.min(business.photos.length - 1, prev + 1)) }}
              className={`absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 ${galleryIndex === business.photos.length - 1 ? 'opacity-30' : ''}`}
              disabled={galleryIndex === business.photos.length - 1}
            >
              <ChevronRight size={24} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {business.photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex(i) }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === galleryIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
            <span className="absolute top-4 left-4 text-white/50 text-sm">{galleryIndex + 1} / {business.photos.length}</span>
          </div>
        )}

        {/* Google Maps Iframe */}
        {hasCoords && (
          <div className="p-4 pb-0">
            <div className="rounded-xl overflow-hidden border border-slate-700/30">
              <iframe
                src={`https://www.google.com/maps?q=${business.latitude},${business.longitude}&z=16&output=embed`}
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps"
              />
            </div>
          </div>
        )}

        {/* Bilgiler */}
        <div className="p-4 space-y-3">
          {/* Puan */}
          {business.rating && (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.rating}</span>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={16} className={n <= Math.round(business.rating) ? 'text-amber-500' : (isDark ? 'text-slate-700' : 'text-gray-200')} fill="currentColor" />
                    ))}
                  </div>
                  {business.reviews_count && (
                    <span className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.reviews_count} degerlendirme</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Iletisim Bilgileri */}
          <div className={`rounded-xl overflow-hidden divide-y ${isDark ? 'bg-slate-800/30 divide-slate-800' : 'bg-gray-50 divide-gray-100'}`}>
            {business.address && (
              <InfoRow icon={<MapPin size={15} />} label="Adres" value={business.address} onCopy={() => copyToClipboard(business.address, 'address')} copied={copied === 'address'} isDark={isDark} />
            )}
            {business.phone && (
              <InfoRow icon={<Phone size={15} />} label="Telefon" value={business.phone} onCopy={() => copyToClipboard(business.phone, 'phone')} copied={copied === 'phone'} isDark={isDark} />
            )}
            {business.website && (
              <InfoRow icon={<Globe size={15} className="text-blue-500" />} label="Website" value={business.website} onCopy={() => copyToClipboard(business.website, 'website')} copied={copied === 'website'} isDark={isDark} isLink />
            )}
            {emails.length > 0 && emails.map((email, i) => (
              <InfoRow key={i} icon={<Mail size={15} className="text-emerald-500" />} label="Email" value={email} onCopy={() => copyToClipboard(email, `email-${i}`)} copied={copied === `email-${i}`} isDark={isDark} />
            ))}
            {business.maps_url && (
              <InfoRow icon={<Navigation size={15} />} label="Maps" value="Google Maps'te Ac" onCopy={() => copyToClipboard(business.maps_url, 'maps')} copied={copied === 'maps'} isDark={isDark} isLink href={business.maps_url} />
            )}
          </div>


          {/* Calisma Saatleri */}
          {hasHours && (
            <Section title="Calisma Saatleri" icon={<Clock size={13} />} isDark={isDark}>
              {business.working_hours.info ? (
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{business.working_hours.info}</p>
              ) : (
                <div className="grid gap-1.5">
                  {Object.entries(business.working_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{day}</span>
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{hours}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Hakkinda */}
          {business.about && (
            <Section title="Hakkinda" icon={<Info size={13} />} isDark={isDark}>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{business.about}</p>
            </Section>
          )}

          {/* Hizmetler */}
          {hasFeatures && (
            <Section title="Hizmetler & Ozellikler" icon={<Tag size={13} />} isDark={isDark}>
              <div className="flex flex-wrap gap-2">
                {business.features.map((feature, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                    {feature}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Sosyal Medya */}
          {hasSocial && (
            <Section title="Sosyal Medya" icon={<ExternalLink size={13} />} isDark={isDark}>
              <div className="grid gap-2">
                {Object.entries(business.social_media).map(([platform, url]) => {
                  const info = SOCIAL_LABELS[platform] || { label: platform, color: isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-gray-500 bg-gray-100 border-gray-200' }
                  return (
                    <div key={platform} className="flex items-center justify-between group">
                      <span className={`text-sm font-medium ${info.color.split(' ')[0]}`}>{info.label}</span>
                      <button
                        onClick={() => copyToClipboard(url, platform)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                      >
                        {copied === platform ? 'Kopyalandi!' : 'Kopyala'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Yorumlar */}
          {hasReviews && (
            <Section title={`Yorumlar (${business.reviews.length})`} icon={<MessageSquare size={13} />} isDark={isDark}>
              <div className="space-y-3">
                {business.reviews.map((review, i) => (
                  <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{review.author}</span>
                      {review.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} size={11} className={n <= review.rating ? 'text-amber-500' : (isDark ? 'text-slate-700' : 'text-gray-200')} fill="currentColor" />
                          ))}
                        </div>
                      )}
                    </div>
                    {review.text && (
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Koordinatlar */}
          {hasCoords && (
            <div className={`text-center py-2 text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}


function Section({ title, icon, isDark, children }) {
  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {icon}
        {title}
      </p>
      {children}
    </div>
  )
}


function InfoRow({ icon, label, value, onCopy, copied, isDark, isLink, href }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 group">
      <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">{value}</a>
        ) : (
          <p className={`text-sm truncate ${isLink ? 'text-blue-500' : (isDark ? 'text-slate-200' : 'text-gray-800')}`}>{value}</p>
        )}
      </div>
      <button
        onClick={onCopy}
        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
      >
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className={isDark ? 'text-slate-500' : 'text-gray-400'} />}
      </button>
    </div>
  )
}
