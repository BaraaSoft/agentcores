/** One block of the inspector: text, such as "Objective" or "What was good", or an image, such as a screenshot. */
export type InspectorSection =
  | { readonly heading: string; readonly body: string }
  | { readonly heading: string; readonly image: { readonly src: string; readonly alt: string } };
