"""
Writes public/music.wav: an original, calm backing track for the video.

C - G - Am - F at 96 bpm: a soft pad, a plucked arpeggio and a sine bass,
faded in over a second and out over the last three. Generated rather than
downloaded so there is no licence to track; swap in any track you prefer.

usage: python3 scripts/make_music.py [seconds]
"""
import array, math, os, random, sys, wave

RATE = 44100
SECONDS = float(sys.argv[1]) if len(sys.argv) > 1 else 42.0
BEAT = 60 / 96
BAR = 4 * BEAT
N = int(SECONDS * RATE)
left = array.array("f", [0.0]) * N
right = array.array("f", [0.0]) * N

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

# root, then the chord's tones, as MIDI notes
CHORDS = [
    (48, [60, 64, 67]),  # C
    (43, [59, 62, 67]),  # G
    (45, [60, 64, 69]),  # Am
    (41, [60, 65, 69]),  # F
]

def add(start, length, freq, gain, attack, decay, pan=0.0, harmonics=((1, 1.0),)):
    i0 = int(start * RATE)
    n = min(int(length * RATE), N - i0)
    lg, rg = gain * (1 - pan) / 2 + gain / 2 * (1 - abs(pan)), gain * (1 + pan) / 2 + gain / 2 * (1 - abs(pan))
    two_pi_f = 2 * math.pi * freq / RATE
    a = max(1, int(attack * RATE))
    for k in range(n):
        env = (k / a if k < a else 1.0) * math.exp(-k / (decay * RATE))
        s = 0.0
        for mult, amp in harmonics:
            s += amp * math.sin(two_pi_f * mult * k)
        v = s * env
        left[i0 + k] += v * lg
        right[i0 + k] += v * rg

random.seed(7)
bars = int(math.ceil(SECONDS / BAR))
for b in range(bars):
    t = b * BAR
    root, tones = CHORDS[b % 4]
    # pad: the chord, slow in and out, slightly detuned between the ears
    for i, m in enumerate(tones):
        for detune, pan in ((0.997, -0.6), (1.003, 0.6)):
            add(t, BAR + 0.6, hz(m - 12) * detune, 0.022, 0.8, 2.2, pan)
    # bass on beats one and three
    for beat in (0, 2):
        add(t + beat * BEAT, 2 * BEAT, hz(root), 0.09, 0.02, 0.9, 0, ((1, 1.0), (2, 0.15)))
    # plucked arpeggio in eighths, up and back down, panned a little
    pattern = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[1] + 24, tones[2] + 12, tones[1] + 12, tones[0] + 12, tones[1] + 12]
    if b >= 1:  # let the first bar breathe
        for e, m in enumerate(pattern):
            add(t + e * BEAT / 2, 0.9, hz(m), 0.05 if e % 2 == 0 else 0.038, 0.004, 0.28,
                0.35 if e % 2 else -0.35, ((1, 1.0), (2, 0.35), (3, 0.12)))

# fade in over a second, out over the last three; then normalise gently
peak = 0.0
for k in range(N):
    t = k / RATE
    g = min(1.0, t / 1.0) * min(1.0, (SECONDS - t) / 3.0)
    left[k] *= g
    right[k] *= g
    peak = max(peak, abs(left[k]), abs(right[k]))
scale = 0.8 / peak if peak else 1.0

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "music.wav")
frames = array.array("h", [0]) * (2 * N)
for k in range(N):
    frames[2 * k] = int(left[k] * scale * 32767)
    frames[2 * k + 1] = int(right[k] * scale * 32767)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes(frames.tobytes())
print(f"wrote {out}: {SECONDS:.1f}s, peak scaled by {scale:.2f}")
