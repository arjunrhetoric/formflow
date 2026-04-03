import { ShortTextInput, LongTextInput, NumberInput, EmailInput, PhoneInput } from './TextInputs';
import { ChoiceInput, RatingInput } from './ChoiceInputs';
import { DateRangeInput, FileUploadInput } from './AdvancedInputs';
import { SignaturePadField } from './SignaturePadField';

export const FieldComponents: Record<string, React.FC<any>> = {
  short_text: ShortTextInput,
  long_text: LongTextInput,
  number: NumberInput,
  email: EmailInput,
  phone: PhoneInput,
  single_select: (props) => <ChoiceInput {...props} isMulti={false} />,
  multi_select: (props) => <ChoiceInput {...props} isMulti={true} />,
  rating: RatingInput,
  date_range: DateRangeInput,
  file_upload: FileUploadInput,
  signature: SignaturePadField,
  signature_pad: SignaturePadField,
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  rating: 'Rating',
  date_range: 'Date Range',
  file_upload: 'File Upload',
  signature_pad: 'Signature Pad',
};
