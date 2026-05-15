export type DuplicateError = {
  links: { title: string; url: string }[]
  message: string
  type?: 'duplicate'
}

export type DuplicatedSdcNotUpdatedError = {
  links: { title: string; url: string }[]
  message: string
  type?: 'duplicated_sdc_not_updated'
}

export type DuplicatedSdcUpdatedError = {
  links: { title: string; url: string }[]
  message: string
  type?: 'duplicated_sdc_updated'
}

export type GenericError = {
  message: string
  type?: 'error'
}

export type TitleBlacklistedError = {
  message: string
  type?: 'title_blacklisted'
}

export type StructuredError =
  | DuplicateError
  | DuplicatedSdcNotUpdatedError
  | DuplicatedSdcUpdatedError
  | GenericError
  | TitleBlacklistedError
