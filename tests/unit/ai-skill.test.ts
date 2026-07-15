import { describe, expect, it } from 'vitest'

import {
  buildInstallCommand,
  buildSkillFile,
} from '../../src/features/api-tokens/ai-skill'

const BASE_URL = 'https://issues.example.test'
const TOKEN = 'imt_live_' + 'a'.repeat(64)

describe('api token AI skill', () => {
  it('documents the real issue API contract', () => {
    const skill = buildSkillFile(BASE_URL, TOKEN)

    expect(skill).toContain(BASE_URL)
    expect(skill).toContain(`Authorization: Bearer ${TOKEN}`)
    expect(skill).toContain('label_ids')
    expect(skill).not.toContain('labels?')
    expect(skill).toContain('body_full')
    expect(skill).toContain('title-prefix search only')
    expect(skill).toContain('status=todo,in_progress&page_size=100')
  })

  it('builds an idempotent install command without deleting the skill directory', () => {
    const command = buildInstallCommand(BASE_URL, TOKEN)

    expect(command).toContain(
      'DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/issue-management"',
    )
    expect(command).toContain('mkdir -p "$DIR"')
    expect(command).toContain('cat > "$DIR/SKILL.md"')
    expect(command).toContain("<<'IMEOF'")
    expect(command).toContain(BASE_URL)
    expect(command).toContain(TOKEN)
    expect(command).not.toContain('rm -rf')
  })
})
