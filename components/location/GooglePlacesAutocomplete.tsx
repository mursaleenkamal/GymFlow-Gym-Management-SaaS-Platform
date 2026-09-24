'use client'

import React from 'react'

interface Props {
  value: string
  onChange: (value: string, normalized?: any) => void
  gymId?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  onClear?: () => void
}

/**
 * Clean text field for area / locality input (Google Places API removed).
 */
export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Type area or locality...',
  className = '',
  disabled = false,
  onClear,
}: Props) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className || 'input-field'}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}
