import { ShortTextInput, LongTextInput, NumberInput } from './TextInputs';
import { ChoiceInput, RatingInput } from './ChoiceInputs';
import { DateRangeInput, FileUploadInput } from './AdvancedInputs';
import { SignaturePadField } from './SignaturePadField';

export const FieldComponents: Record<string, React.FC<any>> = {
  short_text: ShortTextInput,
  long_text: LongTextInput,
  number: NumberInput,
  single_select: (props) => <ChoiceInput {...props} isMulti={false} />,
  multi_select: (props) => <ChoiceInput {...props} isMulti={true} />,
  rating: RatingInput,
  date_range: DateRangeInput,
  file_upload: FileUploadInput,
  signature: SignaturePadField,
};
