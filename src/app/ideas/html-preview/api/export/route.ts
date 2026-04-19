import { NextRequest } from 'next/server';
import JSZip from 'jszip';

interface Variable {
  name: string;
  type: 'text' | 'textarea' | 'number';
  label: string;
  defaultValue: string;
}

export async function POST(req: NextRequest) {
  try {
    const { htmlTemplate, variables, description } = await req.json();

    if (!htmlTemplate) {
      return new Response('htmlTemplate is required', { status: 400 });
    }

    // Build params.json
    const paramsJson = {
      scene_id: `html-preview-${Date.now()}`,
      params: (variables || []).map((v: Variable) => ({
        name: v.name,
        type: v.type === 'textarea' ? 'string' : v.type,
        required: true,
        default: v.defaultValue || null,
        description: v.label,
      })),
    };

    // Build README.md
    const readmeMd = `# ${description || 'HTML Preview Export'}

## 变量说明

${
  variables?.length
    ? variables
        .map(
          (v: Variable) =>
            `- \`{{${v.name}}}\` — ${v.label}（默认值：${v.defaultValue || '无'}）`
        )
        .join('\n')
    : '（无提取的变量）'
}

## 使用方式

1. 打开 \`template.html\` 查看效果
2. 将 \`{{变量名}}\` 替换为实际值
3. 如需动态替换，可使用 JS 批量替换变量

## 技术说明

- 使用 Tailwind CSS（CDN 版本）
- 深色玻璃拟态风格
- 完全自包含，无需构建工具
`;

    // Create zip
    const zip = new JSZip();
    zip.file('template.html', htmlTemplate);
    zip.file('params.json', JSON.stringify(paramsJson, null, 2));
    zip.file('README.md', readmeMd);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="html-preview-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('[export route]', error);
    return new Response(String(error), { status: 500 });
  }
}
