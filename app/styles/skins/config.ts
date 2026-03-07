export type SkinId = 'default' | 'ink' | 'cinnabar'

export interface CardSkin {
  container: string
  header: string
  content: string
  footer: string
  accentColor: string
  borderColor: string
  hoverEffect: string
  activeEffect: string
  iconStyle: string
}

export const skins: Record<SkinId, {
  name: string
  factionCard: CardSkin
  topicCard: CardSkin
  opinionCard: CardSkin
}> = {
  default: {
    name: 'Default',
    factionCard: {
      container: 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50',
      header: 'text-gray-900',
      content: 'text-gray-600',
      footer: 'text-gray-400',
      accentColor: 'text-amber-500',
      borderColor: 'border-gray-200',
      hoverEffect: 'shadow-sm',
      activeEffect: 'bg-white border-gray-900 shadow-sm',
      iconStyle: 'w-3 h-3'
    },
    topicCard: {
      container: 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md',
      header: 'text-gray-900',
      content: 'text-gray-600',
      footer: 'text-gray-400',
      accentColor: 'text-blue-600',
      borderColor: 'border-gray-200',
      hoverEffect: 'shadow-md',
      activeEffect: 'ring-2 ring-blue-500',
      iconStyle: 'w-4 h-4'
    },
    opinionCard: {
      container: 'bg-white border-gray-200 shadow-sm hover:shadow-md',
      header: 'text-gray-800',
      content: 'text-gray-700',
      footer: 'text-gray-500',
      accentColor: 'text-gray-900',
      borderColor: 'border-gray-200',
      hoverEffect: 'hover:border-gray-300',
      activeEffect: '',
      iconStyle: 'w-4 h-4'
    }
  },
  ink: {
    name: 'Ink (MoYun)',
    factionCard: {
      container: 'bg-[#FAFAF7] border-gray-300 hover:border-gray-800 hover:bg-[#F5F5F0] font-serif',
      header: 'text-gray-900 font-bold tracking-wide',
      content: 'text-gray-700',
      footer: 'text-gray-500 font-sans',
      accentColor: 'text-gray-800',
      borderColor: 'border-gray-800',
      hoverEffect: 'shadow-none',
      activeEffect: 'bg-[#FAFAF7] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]',
      iconStyle: 'w-3 h-3 text-gray-800'
    },
    topicCard: {
      container: 'bg-[#FAFAF7] border-gray-300 hover:border-gray-800 hover:bg-[#F5F5F0] font-serif',
      header: 'text-gray-900 font-bold tracking-wide text-lg',
      content: 'text-gray-700 font-light',
      footer: 'text-gray-500 font-sans',
      accentColor: 'text-gray-900',
      borderColor: 'border-gray-800',
      hoverEffect: 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]',
      activeEffect: 'border-gray-900',
      iconStyle: 'w-4 h-4 text-gray-800'
    },
    opinionCard: {
      container: 'bg-[#FAFAF7] border-gray-300 shadow-none hover:border-gray-600 font-serif',
      header: 'text-gray-900 font-bold',
      content: 'text-gray-800 leading-relaxed',
      footer: 'text-gray-500 font-sans text-xs',
      accentColor: 'text-gray-900',
      borderColor: 'border-gray-400',
      hoverEffect: 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]',
      activeEffect: '',
      iconStyle: 'w-4 h-4 text-gray-700'
    }
  },
  cinnabar: {
    name: 'Cinnabar (ZhuSha)',
    factionCard: {
      container: 'bg-white border-red-200 hover:border-red-600 hover:bg-red-50/10',
      header: 'text-red-900 font-bold',
      content: 'text-red-800',
      footer: 'text-red-400',
      accentColor: 'text-red-600',
      borderColor: 'border-red-600',
      hoverEffect: 'shadow-sm',
      activeEffect: 'bg-red-50/20 border-red-700 shadow-inner',
      iconStyle: 'w-3 h-3 text-red-600'
    },
    topicCard: {
      container: 'bg-white border-red-200 hover:border-red-500',
      header: 'text-red-950 font-bold',
      content: 'text-red-900',
      footer: 'text-red-400',
      accentColor: 'text-red-700',
      borderColor: 'border-red-500',
      hoverEffect: 'shadow-md shadow-red-100',
      activeEffect: 'ring-2 ring-red-500',
      iconStyle: 'w-4 h-4 text-red-700'
    },
    opinionCard: {
      container: 'bg-white border-red-100 shadow-sm hover:border-red-300',
      header: 'text-red-900',
      content: 'text-gray-800',
      footer: 'text-red-300',
      accentColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverEffect: 'hover:shadow-md hover:shadow-red-50',
      activeEffect: '',
      iconStyle: 'w-4 h-4 text-red-500'
    }
  }
}
