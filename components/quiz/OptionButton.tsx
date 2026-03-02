import { CheckCircle, XCircle } from 'lucide-react'

interface OptionButtonProps {
  optionKey: 'A' | 'B' | 'C' | 'D'
  text: string
  state: 'default' | 'correct' | 'incorrect' | 'revealed'
  onClick: () => void
  disabled: boolean
}

export function OptionButton({ optionKey, text, state, onClick, disabled }: OptionButtonProps) {
  // Determine button styles based on state
  const getButtonClasses = () => {
    const baseClasses =
      'w-full min-h-[56px] rounded-xl text-left flex items-center justify-between p-4 transition-all duration-200'

    switch (state) {
      case 'correct':
        return `${baseClasses} bg-green-50 border-2 border-green-500 text-green-800`
      case 'incorrect':
        return `${baseClasses} bg-red-50 border-2 border-red-500 text-red-800`
      case 'revealed':
        return `${baseClasses} bg-green-50 border-2 border-green-400 text-green-700`
      default:
        return `${baseClasses} bg-white border-2 border-gray-200 hover:border-[#FF6B00] hover:bg-[#FFF3EC] ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`
    }
  }

  return (
    <button onClick={onClick} disabled={disabled} className={getButtonClasses()}>
      <div className="flex items-center gap-3 flex-1">
        {/* Option Letter Badge */}
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            state === 'correct' || state === 'revealed'
              ? 'bg-green-500 text-white'
              : state === 'incorrect'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {optionKey}
        </div>

        {/* Option Text */}
        <span className="text-base font-medium">{text}</span>
      </div>

      {/* Right Icon (shown only for correct/incorrect states) */}
      {state === 'correct' && <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />}
      {state === 'incorrect' && <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />}
      {state === 'revealed' && <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />}
    </button>
  )
}
