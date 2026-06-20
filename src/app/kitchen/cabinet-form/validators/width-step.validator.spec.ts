import { FormControl } from '@angular/forms';
import { widthStepValidator } from './width-step.validator';

describe('widthStepValidator', () => {
  it('zwraca neutralny językowo kontrakt błędu bez pola message', () => {
    const control = new FormControl(450);

    const result = widthStepValidator(400, 100)(control);

    expect(result).toEqual({
      widthStep: {
        requiredStep: 100,
        minWidth: 400,
        actualValue: 450,
      },
    });
    expect(result?.['widthStep'].message).toBeUndefined();
  });

  it('akceptuje wartość zgodną z krokiem', () => {
    const control = new FormControl(600);

    expect(widthStepValidator(400, 100)(control)).toBeNull();
  });
});
