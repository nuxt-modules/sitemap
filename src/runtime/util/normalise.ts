export function normaliseDate(date: Date | string | unknown) {
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date))
    return false
  const z = n => (`0${n}`).slice(-2)
  return (
    `${d.getFullYear()
    }-${
    z(d.getMonth() + 1)
    }-${
    z(d.getDate())
    }T${
    z(d.getHours())
    }:${
    z(d.getMinutes())
    }:${
    z(d.getSeconds())
    }+00:00`
  )
}
