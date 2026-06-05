import { X, MapPin, Phone, Globe, Star, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react'
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

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  const hasSocial = business.social_media && Object.keys(business.social_media).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`rounded-xl w-full max-w-lg max-h-[80vh] overflow-auto m-4 ${
          isDark ? 'bg-slate-900 border border-slate-700/60' : 'bg-white border border-gray-200 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start justify-between p-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h2>
            {business.category && (
              <span className={`text-xs px-2 py-0.5 mt-1.5 inline-block rounded-md ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                {business.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {business.rating && (
            <div className="flex items-center gap-2.5">
              <Star size={16} className="text-amber-500" fill="currentColor" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>
                {business.rating} / 5
                {business.reviews_count && (
                  <span className={`ml-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({business.reviews_count} yorum)</span>
                )}
              </span>
            </div>
          )}

          {business.address && (
            <div className="flex items-center gap-2.5 group">
              <MapPin size={16} className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <span className={`flex-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{business.address}</span>
              <button
                onClick={() => copyToClipboard(business.address, 'address')}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
              >
                {copied === 'address' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className={isDark ? 'text-slate-500' : 'text-gray-400'} />}
              </button>
            </div>
          )}

          {business.phone && (
            <div className="flex items-center gap-2.5 group">
              <Phone size={16} className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <span className={`flex-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{business.phone}</span>
              <button
                onClick={() => copyToClipboard(business.phone, 'phone')}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
              >
                {copied === 'phone' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className={isDark ? 'text-slate-500' : 'text-gray-400'} />}
              </button>
            </div>
          )}

          {business.website && (
            <div className="flex items-center gap-2.5 group">
              <Globe size={16} className="text-blue-500 shrink-0" />
              <span className="text-blue-500 text-sm flex-1 truncate">{business.website}</span>
              <button
                onClick={() => copyToClipboard(business.website, 'website')}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
              >
                {copied === 'website' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className={isDark ? 'text-slate-500' : 'text-gray-400'} />}
              </button>
            </div>
          )}

          {hasSocial && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <p className={`text-xs font-medium mb-2.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Sosyal Medya</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(business.social_media).map(([platform, url]) => {
                  const info = SOCIAL_LABELS[platform] || { label: platform, color: isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-gray-500 bg-gray-100 border-gray-200' }
                  return (
                    <button
                      key={platform}
                      onClick={() => copyToClipboard(url, platform)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors hover:opacity-80 ${info.color}`}
                      title={url}
                    >
                      {copied === platform ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <ExternalLink size={11} />
                      )}
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {business.about && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <p className={`text-xs font-medium mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Hakkinda</p>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{business.about}</p>
            </div>
          )}

          {business.reviews && business.reviews.length > 0 && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <p className={`text-xs font-medium mb-2.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <MessageSquare size={11} className="inline mr-1" />
                Son Yorumlar
              </p>
              <div className="space-y-2">
                {business.reviews.map((review, i) => (
                  <div key={i} className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{review.author}</span>
                      {review.rating && (
                        <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                          <Star size={10} fill="currentColor" />
                          {review.rating}
                        </span>
                      )}
                    </div>
                    {review.text && (
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{review.text}</p>
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
