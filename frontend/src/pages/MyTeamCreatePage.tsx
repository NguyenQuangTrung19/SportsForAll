import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import { defaultSportCoverImage, teamStatusMeta, type TeamStatus } from '../data/teams'
import './MyTeamCreatePage.css'

type AddMemberMode = 'friends' | 'contact'
type CreateStep = 1 | 2 | 3

type CreateTeamForm = {
  name: string
  sports: string[]
  memberCount: number
  addMemberMode: AddMemberMode
  selectedFriendIds: string[]
  contactInput: string
  manager: string
  status: TeamStatus
}

const sportOptions = [
  'Bóng đá',
  'Bóng chuyền',
  'Cầu lông',
  'Bóng rổ',
  'Tennis',
  'Pickleball',
  'Chạy bộ',
  'Bơi lội',
  'Cờ vua',
]

const friendOptions = [
  { id: 'f-1', name: 'Nguyễn Thanh Bình' },
  { id: 'f-2', name: 'Trần Minh Khôi' },
  { id: 'f-3', name: 'Lê Thuỳ Dương' },
  { id: 'f-4', name: 'Phạm Tuấn Anh' },
]

const createTeamCoverImages: Record<string, string> = {
  'Bóng đá':
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80',
  'Bóng chuyền':
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80',
  'Cầu lông':
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=80',
  'Bóng rổ':
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80',
  Tennis:
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1400&q=80',
  Pickleball:
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1400&q=80',
  'Chạy bộ':
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80',
  'Bơi lội':
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1400&q=80',
  'Cờ vua':
    'https://images.unsplash.com/photo-1528819622765-d6bcf132f793?auto=format&fit=crop&w=1400&q=80',
}

const defaultForm: CreateTeamForm = {
  name: '',
  sports: [],
  memberCount: 1,
  addMemberMode: 'friends',
  selectedFriendIds: [],
  contactInput: '',
  manager: '',
  status: 'recruiting',
}

const defaultTeamLogoUrl = 'https://ui-avatars.com/api/?name=Team&background=2563eb&color=ffffff&size=256'

async function createImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Không thể tải ảnh để cắt.'))
  })

  return image
}

async function buildCroppedLogo(imageSource: string, cropPixels: Area): Promise<string> {
  const image = await createImage(imageSource)
  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Không thể khởi tạo vùng cắt ảnh.')
  }

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  )

  return canvas.toDataURL('image/png')
}

function MyTeamCreatePage() {
  const [form, setForm] = useState<CreateTeamForm>(defaultForm)
  const [currentStep, setCurrentStep] = useState<CreateStep>(1)

  const [logoOriginal, setLogoOriginal] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null)

  const [lastSelectedSport, setLastSelectedSport] = useState('')
  const [createError, setCreateError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedFriends = useMemo(
    () => friendOptions.filter((friend) => form.selectedFriendIds.includes(friend.id)).map((friend) => friend.name),
    [form.selectedFriendIds],
  )

  const previewSport =
    lastSelectedSport && form.sports.includes(lastSelectedSport)
      ? lastSelectedSport
      : (form.sports[form.sports.length - 1] ?? 'Bóng đá')
  const coverImage = createTeamCoverImages[previewSport] ?? defaultSportCoverImage

  function onTeamFieldChange<K extends keyof CreateTeamForm>(field: K, value: CreateTeamForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function onSportToggle(sport: string) {
    setForm((prev) => {
      const hasSport = prev.sports.includes(sport)
      const nextSports = hasSport ? prev.sports.filter((item) => item !== sport) : [...prev.sports, sport]

      if (hasSport && lastSelectedSport === sport) {
        const nextLastSelected = nextSports[nextSports.length - 1] ?? ''
        setLastSelectedSport(nextLastSelected)
      }

      if (!hasSport) {
        setLastSelectedSport(sport)
      }

      return {
        ...prev,
        sports: nextSports,
      }
    })
  }

  function onFriendToggle(friendId: string) {
    setForm((prev) => {
      const hasFriend = prev.selectedFriendIds.includes(friendId)
      const selectedFriendIds = hasFriend
        ? prev.selectedFriendIds.filter((id) => id !== friendId)
        : [...prev.selectedFriendIds, friendId]

      return {
        ...prev,
        selectedFriendIds,
      }
    })
  }

  function onLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    const previewUrl = URL.createObjectURL(selectedFile)
    setLogoOriginal(previewUrl)
    setLogoPreview(previewUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedPixels(null)
    setCreateError('')
    setSuccessMessage('')
  }

  function clearUploadedLogo() {
    setLogoOriginal('')
    setLogoPreview('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedPixels(null)
  }

  async function applyCrop() {
    if (!logoOriginal || !croppedPixels) {
      return
    }

    try {
      const cropped = await buildCroppedLogo(logoOriginal, croppedPixels)
      setLogoPreview(cropped)
      setCreateError('')
    } catch {
      setCreateError('Không thể áp dụng crop. Vui lòng thử lại.')
    }
  }

  function validateStep(step: CreateStep) {
    if (step === 1) {
      if (form.name.trim().length < 3) {
        setCreateError('Tên team cần ít nhất 3 ký tự.')
        return false
      }

      if (form.sports.length === 0) {
        setCreateError('Bạn cần chọn ít nhất 1 môn thể thao cho team.')
        return false
      }

      if (form.memberCount < 1) {
        setCreateError('Số lượng thành viên phải lớn hơn hoặc bằng 1.')
        return false
      }
    }

    if (step === 2 && form.addMemberMode === 'contact' && form.contactInput.trim().length === 0) {
      setCreateError('Vui lòng nhập ID hoặc số điện thoại thành viên cần thêm.')
      return false
    }

    setCreateError('')
    return true
  }

  function nextStep() {
    if (!validateStep(currentStep)) {
      return
    }

    setSuccessMessage('')
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as CreateStep) : prev))
  }

  function previousStep() {
    setCreateError('')
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as CreateStep) : prev))
  }

  async function onCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateStep(1) || !validateStep(2)) {
      return
    }

    setCreateError('')
    setSuccessMessage('Tạo team thành công. Bạn có thể quay lại My Team để xem danh sách.')
    setForm(defaultForm)
    setCurrentStep(1)
    setLastSelectedSport('')
    clearUploadedLogo()
  }

  const stepItems = [
    { id: 1, label: 'Thông tin cơ bản' },
    { id: 2, label: 'Thành viên' },
    { id: 3, label: 'Xác nhận' },
  ]

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="my-team-create-page panel">
        <motion.header
          className="create-team-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="create-team-hero-glow create-team-hero-glow-1" aria-hidden="true" />
          <div className="create-team-hero-glow create-team-hero-glow-2" aria-hidden="true" />

          <div className="create-team-hero-content">
            <p className="create-team-eyebrow">My Team</p>
            <h1>Tạo team mới</h1>
            <p>Điền thông tin theo 3 bước và xem thẻ team preview realtime trước khi tạo.</p>

            <div className="create-team-hero-badges" aria-label="Thông tin nổi bật">
              <span>Stepper flow</span>
              <span>Realtime preview</span>
              <span>Avatar crop preset</span>
            </div>
          </div>

          <Link to="/my-team" className="back-to-my-team-link">
            ← Quay về My Team
          </Link>
        </motion.header>

        <div className="create-team-content-grid">
          <form className="create-team-form" onSubmit={onCreateTeam}>
            <ol className="create-team-stepper" aria-label="Tiến trình tạo team">
              {stepItems.map((step) => {
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id

                return (
                  <li
                    key={step.id}
                    className={isActive ? 'step-item active' : isCompleted ? 'step-item done' : 'step-item'}
                  >
                    <span className="step-index">{step.id}</span>
                    <span className="step-label">{step.label}</span>
                  </li>
                )
              })}
            </ol>

            {currentStep === 1 ? (
              <section className="step-panel" aria-label="Thông tin cơ bản">
                <div className="create-team-grid">
                  <div className="toolbar-group toolbar-group-wide">
                    <label htmlFor="new-team-name">Tên Team</label>
                    <input
                      id="new-team-name"
                      type="text"
                      placeholder="Nhập tên team..."
                      value={form.name}
                      onChange={(event) => onTeamFieldChange('name', event.target.value)}
                    />
                  </div>

                  <div className="toolbar-group">
                    <label>Số lượng thành viên</label>
                    <input
                      type="number"
                      min={1}
                      value={form.memberCount}
                      onChange={(event) => onTeamFieldChange('memberCount', Number(event.target.value) || 1)}
                    />
                  </div>

                  <div className="toolbar-group">
                    <label htmlFor="new-team-status">Trạng thái team</label>
                    <select
                      id="new-team-status"
                      value={form.status}
                      onChange={(event) => onTeamFieldChange('status', event.target.value as TeamStatus)}
                    >
                      {(Object.keys(teamStatusMeta) as TeamStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {teamStatusMeta[status].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="toolbar-group sport-picker-group">
                  <label>Chọn môn thể thao team hoạt động (1 hoặc nhiều)</label>
                  <div className="sport-chip-list">
                    {sportOptions.map((sport) => {
                      const active = form.sports.includes(sport)

                      return (
                        <button
                          type="button"
                          key={sport}
                          className={active ? 'sport-chip active' : 'sport-chip'}
                          onClick={() => onSportToggle(sport)}
                        >
                          {sport}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="toolbar-group">
                  <label htmlFor="new-team-logo">Ảnh đại diện / logo team (cắt dạng lưới)</label>
                  <input id="new-team-logo" type="file" accept="image/*" onChange={onLogoUpload} />

                  {!logoOriginal ? (
                    <p className="logo-helper-text">
                      Nếu chưa chọn ảnh, hệ thống sẽ dùng ảnh đại diện mặc định cho team.
                    </p>
                  ) : (
                    <div className="logo-crop-wrap">
                      <div className="logo-cropper-stage">
                        <Cropper
                          image={logoOriginal}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          showGrid
                          cropShape="round"
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={(_, pixels) => setCroppedPixels(pixels)}
                        />
                      </div>

                      <div className="logo-crop-controls">
                        <p className="logo-helper-text">Kéo ảnh và dùng lưới để canh vùng cắt chuẩn.</p>

                        <label htmlFor="logo-zoom">Thu phóng</label>
                        <input
                          id="logo-zoom"
                          type="range"
                          min={1}
                          max={3}
                          step={0.01}
                          value={zoom}
                          onChange={(event) => setZoom(Number(event.target.value))}
                        />

                        <button type="button" className="action-btn" onClick={applyCrop}>
                          Áp dụng crop
                        </button>
                        <button type="button" className="action-btn ghost" onClick={clearUploadedLogo}>
                          Dùng ảnh mặc định hệ thống
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="step-panel" aria-label="Thiết lập thành viên">
                <div className="create-team-grid">
                  <div className="toolbar-group">
                    <label>Thêm thành viên</label>
                    <div className="inline-choice">
                      <button
                        type="button"
                        className={form.addMemberMode === 'friends' ? 'choice-btn active' : 'choice-btn'}
                        onClick={() => onTeamFieldChange('addMemberMode', 'friends')}
                      >
                        Chọn từ bạn bè
                      </button>
                      <button
                        type="button"
                        className={form.addMemberMode === 'contact' ? 'choice-btn active' : 'choice-btn'}
                        onClick={() => onTeamFieldChange('addMemberMode', 'contact')}
                      >
                        Nhập ID / số điện thoại
                      </button>
                    </div>

                    {form.addMemberMode === 'friends' ? (
                      <div className="friend-check-list">
                        {friendOptions.map((friend) => {
                          const checked = form.selectedFriendIds.includes(friend.id)

                          return (
                            <label key={friend.id} className="friend-check-item">
                              <input type="checkbox" checked={checked} onChange={() => onFriendToggle(friend.id)} />
                              <span>{friend.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ví dụ: member_001 hoặc 09xxxxxxxx"
                        value={form.contactInput}
                        onChange={(event) => onTeamFieldChange('contactInput', event.target.value)}
                      />
                    )}
                  </div>

                  <div className="toolbar-group">
                    <label>Trưởng nhóm</label>
                    <input value="Bạn" readOnly />
                  </div>

                  <div className="toolbar-group">
                    <label htmlFor="new-team-manager">Quản lý (không bắt buộc)</label>
                    <select
                      id="new-team-manager"
                      value={form.manager}
                      onChange={(event) => onTeamFieldChange('manager', event.target.value)}
                    >
                      <option value="">Để trống, chỉnh sau</option>
                      <option value="Bạn">Bạn</option>
                      {friendOptions.map((friend) => (
                        <option key={friend.id} value={friend.name}>
                          {friend.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section className="step-panel" aria-label="Xác nhận thông tin">
                <div className="confirm-grid">
                  <article className="confirm-item">
                    <p>Tên team</p>
                    <strong>{form.name || 'Chưa nhập'}</strong>
                  </article>
                  <article className="confirm-item">
                    <p>Môn thể thao</p>
                    <strong>{form.sports.length ? form.sports.join(', ') : 'Chưa chọn'}</strong>
                  </article>
                  <article className="confirm-item">
                    <p>Số lượng thành viên</p>
                    <strong>{form.memberCount}</strong>
                  </article>
                  <article className="confirm-item">
                    <p>Trạng thái</p>
                    <strong>{teamStatusMeta[form.status].label}</strong>
                  </article>
                  <article className="confirm-item">
                    <p>Quản lý</p>
                    <strong>{form.manager || 'Để trống'}</strong>
                  </article>
                  <article className="confirm-item">
                    <p>Thành viên thêm mới</p>
                    <strong>
                      {form.addMemberMode === 'friends'
                        ? selectedFriends.length
                          ? selectedFriends.join(', ')
                          : 'Chưa chọn'
                        : form.contactInput || 'Chưa nhập'}
                    </strong>
                  </article>
                </div>
              </section>
            ) : null}

            {createError ? <p className="form-error">{createError}</p> : null}
            {successMessage ? <p className="form-success">{successMessage}</p> : null}

            <div className="create-team-actions">
              <button type="button" className="action-btn ghost" onClick={previousStep} disabled={currentStep === 1}>
                Quay lại
              </button>

              {currentStep < 3 ? (
                <button type="button" className="action-btn" onClick={nextStep}>
                  Tiếp tục
                </button>
              ) : (
                <button type="submit" className="action-btn">
                  Xác nhận tạo team
                </button>
              )}
            </div>
          </form>

          <aside className="team-preview-panel" aria-label="Team card preview">
            <h3>Xem trước thẻ team</h3>
            <article className="team-preview-card">
              <img src={coverImage} alt={previewSport} className="team-preview-cover" loading="lazy" />
              <div className="team-preview-overlay" aria-hidden="true" />

              <div className="team-preview-content">
                <div className="team-preview-head">
                  <div className="team-preview-brand-row">
                    <img src={logoPreview || defaultTeamLogoUrl} alt="Team logo preview" className="team-preview-logo" />
                    <div>
                      <h4>{form.name || 'Tên team của bạn'}</h4>
                      <p className="team-preview-sport">
                        {form.sports.length ? form.sports.join(', ') : 'Chọn môn thể thao'}
                      </p>
                    </div>
                  </div>

                  <span className={`team-status-pill ${teamStatusMeta[form.status].className}`}>
                    {teamStatusMeta[form.status].label}
                  </span>
                </div>

                <ul>
                  <li>Trưởng nhóm: Bạn</li>
                  <li>Quản lý: {form.manager || 'Để trống'}</li>
                  <li>Thành viên: {form.memberCount}</li>
                  <li>
                    Thêm mới:{' '}
                    {form.addMemberMode === 'friends'
                      ? selectedFriends.length
                        ? selectedFriends.length
                        : 0
                      : form.contactInput.trim().length
                        ? 1
                        : 0}
                  </li>
                </ul>

                <div className="team-preview-footer">
                  <span>Bản xem trước realtime trước khi tạo</span>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </AppShell>
  )
}

export default MyTeamCreatePage
