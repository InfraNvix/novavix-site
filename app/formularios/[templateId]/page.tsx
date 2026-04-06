import DynamicFormClient from './ui'

export default function PublicDynamicFormPage({
  params,
}: {
  params: { templateId: string }
}) {
  return <DynamicFormClient templateId={params.templateId} />
}

