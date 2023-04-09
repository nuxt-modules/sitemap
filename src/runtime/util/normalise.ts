export function normaliseDate(date: Date | string | unknown) {
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date))
    return false
  const z = n => (`0${n}`).slice(-2)
  return (
    `${d.getUTCFullYear()
    }-${
    z(d.getUTCMonth() + 1)
    }-${
    z(d.getUTCDate())
    }T${
    z(d.getUTCHours())
    }:${
    z(d.getUTCMinutes())
    }:${
    z(d.getUTCSeconds())
    }+00:00`
  )
}
