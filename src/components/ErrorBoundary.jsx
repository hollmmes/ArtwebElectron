import { Component } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  // resetKey değişince (modül değişimi) hata durumunu temizle
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const isDark = this.props.isDark
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className={`max-w-lg w-full rounded-xl border p-6 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Bu modül yüklenirken bir hata oluştu</h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Diğer modüllere geçiş yapabilir veya yeniden deneyebilirsiniz.</p>
            </div>
          </div>

          {this.state.error && (
            <pre className={`text-[11px] rounded-lg p-3 mb-3 overflow-auto max-h-40 whitespace-pre-wrap ${isDark ? 'bg-slate-950 text-red-300' : 'bg-gray-50 text-red-600'}`}>
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}

          <button onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <RotateCw size={15} /> Yeniden Dene
          </button>
        </div>
      </div>
    )
  }
}
