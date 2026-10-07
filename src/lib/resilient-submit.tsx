/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const resilientSubmitProps = (target: string) => ({
  'data-resilient-submit': true,
  'data-resilient-submit-target': target,
})

export const renderSubmissionKeyInput = (submissionKey: string | undefined) => (
  <input type='hidden' name='submissionKey' value={submissionKey ?? ''} />
)

export const renderResilientSubmitScript = () => (
  <script src='/js/resilient-submit.js' type='module'></script>
)
