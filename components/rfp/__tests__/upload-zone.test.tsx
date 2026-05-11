import { render, screen } from '@testing-library/react'
import { UploadZone } from '../upload-zone'

test('renders upload zone with instruction text', () => {
  render(<UploadZone onUpload={async () => {}} />)
  expect(screen.getByText(/drop your rfp/i)).toBeInTheDocument()
})

test('shows accepted file types', () => {
  render(<UploadZone onUpload={async () => {}} />)
  expect(screen.getByText(/pdf.*docx/i)).toBeInTheDocument()
})
